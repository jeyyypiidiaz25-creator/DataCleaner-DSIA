import os
import io
import pandas as pd
import numpy as np
from flask import Flask, render_template, request, send_file, jsonify, redirect, url_for, session

app = Flask(__name__)
# Clé secrète pour gérer la connexion session (admin)
app.secret_key = os.environ.get('SECRET_KEY', 'datacleaner_secret_key_2024')

# --- AUTHENTIFICATION SIMPLE (SANS BDD) ---

@app.route('/')
def index():
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    error = None
    if request.method == 'POST':
        # Identifiants en dur pour la soutenance
        username = request.form.get('username')
        password = request.form.get('password')
        
        if username == "admin" and password == "admin123":
            session['user'] = username
            return redirect(url_for('dashboard'))
        else:
            error = "Identifiants incorrects"
            
    return render_template('login.html', error=error)

@app.route('/logout')
def logout():
    session.pop('user', None)
    return redirect(url_for('login'))

# --- TABLEAU DE BORD ---

@app.route('/dashboard')
def dashboard():
    if 'user' not in session:
        return redirect(url_for('login'))
    return render_template('landing.html')

# --- MOTEUR DE NETTOYAGE MULTI-FORMATS ---

@app.route('/process', methods=['POST'])
def process_file():
    if 'user' not in session:
        return redirect(url_for('login'))

    if 'file' not in request.files:
        return "Aucun fichier envoyé", 400
    
    file = request.files['file']
    if file.filename == '':
        return "Fichier vide", 400

    filename = file.filename.lower()

    try:
        # 1. LECTURE (CSV, XLSX, JSON, XML)
        if filename.endswith('.csv'):
            df = pd.read_csv(file)
        elif filename.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(file)
        elif filename.endswith('.json'):
            df = pd.read_json(file)
        elif filename.endswith('.xml'):
            df = pd.read_xml(file)
        else:
            return "Format non supporté (Utilisez CSV, XLSX, JSON ou XML)", 400

        # 2. NETTOYAGE GÉNÉRIQUE
        df = df.drop_duplicates()           # Supprime les doublons
        df = df.dropna(how='all', axis=1)    # Supprime les colonnes vides
        df = df.dropna(how='all', axis=0)    # Supprime les lignes vides

        # 3. EXPORT EN EXCEL (format universel de sortie)
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            df.to_excel(writer, index=False, sheet_name='Data_Cleaned')
        output.seek(0)

        return send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=f"nettoye_{file.filename.split('.')[0]}.xlsx"
        )

    except Exception as e:
        return f"Erreur de traitement : {str(e)}", 500

# --- LANCEMENT ---

if __name__ == '__main__':
    # Render utilise la variable d'environnement PORT. 
    # Si elle n'existe pas (local), on utilise 5000.
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)