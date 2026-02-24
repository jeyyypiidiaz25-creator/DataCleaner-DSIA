from flask import Flask, render_template, request, send_file, jsonify, redirect, url_for
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
import pandas as pd
import numpy as np
import os
import psycopg2
from psycopg2.extras import RealDictCursor # Indispensable pour garder la structure de dictionnaire
import re

app = Flask(__name__)
app.secret_key = 'datacleaner_secret_key_2026'

# --- CONFIGURATION LOGIN ---
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

# --- CONFIGURATION DE LA BASE DE DONNÉES POSTGRESQL ---
def get_db_connection():
    try:
        # En local, utilise tes identifiants pgAdmin
        # Lors du déploiement sur Render, on utilisera une variable d'environnement
        connection = psycopg2.connect(
            host=os.getenv("DB_HOST", "localhost"),
            database=os.getenv("DB_NAME", "traitements"),
            user=os.getenv("DB_USER", "postgres"),
            password=os.getenv("DB_PASS", "0000"), # <--- CHANGE LE MOT DE PASSE ICI
            port=os.getenv("DB_PORT", "5432")
        )
        return connection
    except Exception as e:
        print(f"Erreur de connexion PostgreSQL : {e}")
        return None

# --- CLASSE UTILISATEUR POUR SESSION ---
class User(UserMixin):
    def __init__(self, id, username):
        self.id = id
        self.username = username

@login_manager.user_loader
def load_user(user_id):
    conn = get_db_connection()
    if conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
        user_data = cursor.fetchone()
        conn.close()
        if user_data:
            return User(user_data['id'], user_data['username'])
    return None

# --- MOTEUR DE NETTOYAGE ---
def clean_data(df, options):
    details = {"doublons": 0, "manquants": 0, "aberrantes": 0, "normalisation": "Non"}
    
    if options.get('duplicates'):
        avant = len(df)
        df = df.drop_duplicates()
        details["doublons"] = avant - len(df)
    
    if options.get('missing'):
        num_cols = df.select_dtypes(include=[np.number]).columns
        details["manquants"] = int(df[num_cols].isnull().sum().sum())
        df[num_cols] = df[num_cols].fillna(df[num_cols].mean())
    
    if options.get('outliers'):
        avant = len(df)
        for col in df.select_dtypes(include=[np.number]).columns:
            Q1 = df[col].quantile(0.25)
            Q3 = df[col].quantile(0.75)
            IQR = Q3 - Q1
            df = df[(df[col] >= Q1 - 1.5 * IQR) & (df[col] <= Q3 + 1.5 * IQR)]
        details["aberrantes"] = avant - len(df)

    if options.get('normalize'):
        details["normalisation"] = "Oui"
        for col in df.select_dtypes(include=[np.number]).columns:
            if df[col].max() != df[col].min():
                df[col] = (df[col] - df[col].min()) / (df[col].max() - df[col].min())
            
    return df, details

# --- ROUTES ---

@app.route('/')
def landing():
    return render_template('landing.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        conn = get_db_connection()
        if conn:
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            cursor.execute("SELECT * FROM users WHERE username = %s AND password = %s", (username, password))
            user_record = cursor.fetchone()
            conn.close()
            if user_record:
                user = User(user_record['id'], user_record['username'])
                login_user(user)
                return redirect(url_for('index'))
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('landing'))

@app.route('/app')
@login_required
def index():
    return render_template('index.html')

@app.route('/process', methods=['POST'])
@login_required
def process_data():
    file = request.files.get('file')
    if not file or file.filename == '':
        return jsonify({"error": "Aucun fichier sélectionné"}), 400

    clean_filename = re.sub(r'[^\w\s.-]', '_', file.filename)
    ext = file.filename.split('.')[-1].lower()
    
    try:
        if ext == 'csv': df = pd.read_csv(file)
        elif ext in ['xls', 'xlsx']: df = pd.read_excel(file)
        elif ext == 'json': df = pd.read_json(file)
        else: return jsonify({"error": "Format non supporté"}), 400
    except Exception as e:
        return jsonify({"error": f"Erreur de lecture : {str(e)}"}), 400

    options = {
        'missing': request.form.get('missing') == 'true',
        'outliers': request.form.get('outliers') == 'true',
        'duplicates': request.form.get('duplicates') == 'true',
        'normalize': request.form.get('normalize') == 'true'
    }

    rows_before = len(df)
    df_cleaned, details = clean_data(df, options)
    rows_after = len(df_cleaned)

    output_path = "cleaned_data.csv"
    df_cleaned.to_csv(output_path, index=False)

    # Sauvegarde Historique BDD
    conn = get_db_connection()
    if conn:
        cursor = conn.cursor()
        actions = f"D:{details['doublons']}, M:{details['manquants']}, O:{details['aberrantes']}, N:{details['normalisation']}"
        query = "INSERT INTO traitements (nom_fichier, date_traitement, lignes_avant, lignes_apres, actions) VALUES (%s, NOW(), %s, %s, %s)"
        cursor.execute(query, (clean_filename, rows_before, rows_after, actions))
        conn.commit()
        conn.close()

    preview_data = df_cleaned.head(10).replace({np.nan: None}).to_dict(orient='records')
    columns = df_cleaned.columns.tolist()

    return jsonify({
        "rows_before": rows_before, 
        "rows_after": rows_after, 
        "details": details, 
        "columns": columns,
        "preview": preview_data,
        "download_url": "/download"
    })

@app.route('/download')
@login_required
def download():
    return send_file("cleaned_data.csv", as_attachment=True, download_name="donnees_nettoyees.csv")

@app.route('/historique')
@login_required
def historique():
    conn = get_db_connection()
    if not conn: return render_template('historique.html', historique=[])
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    cursor.execute("SELECT * FROM traitements ORDER BY date_traitement DESC")
    data = cursor.fetchall()
    conn.close()
    return render_template('historique.html', historique=data)

@app.route('/delete/<int:id>', methods=['DELETE'])
@login_required
def delete_item(id):
    conn = get_db_connection()
    if conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM traitements WHERE id = %s", (id,))
        conn.commit()
        conn.close()
        return jsonify({"success": True})
    return jsonify({"success": False}), 500

if __name__ == '__main__':
    app.run(debug=True)