import os
import pandas as pd
from flask import Flask, render_template, request, session, redirect, url_for

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'votre_cle_secrete_2026')

@app.route('/')
def index():
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        # Identifiants simplifiés pour ta démo
        if request.form.get('username') == "admin" and request.form.get('password') == "admin123":
            session['user'] = "admin"
            return redirect(url_for('dashboard'))
    return render_template('login.html')

@app.route('/dashboard')
def dashboard():
    if 'user' not in session:
        return redirect(url_for('login'))
    # État initial (Image 12)
    return render_template('landing.html', show_results=False)

@app.route('/process', methods=['POST'])
def process_file():
    if 'user' not in session:
        return redirect(url_for('login'))
    
    file = request.files.get('file')
    if not file:
        return "Erreur : Aucun fichier", 400

    try:
        # Lecture du fichier
        df = pd.read_csv(file) if file.filename.endswith('.csv') else pd.read_excel(file)
        
        # --- LOGIQUE STATISTIQUE (Image 13) ---
        initial_count = len(df)
        
        # Simulation d'un nettoyage (suppression doublons)
        df_cleaned = df.drop_duplicates()
        cleaned_count = len(df_cleaned)
        
        # Aperçu HTML pour le tableau
        preview_html = df_cleaned.head(10).to_html(classes='table table-hover', index=False)

        return render_template('landing.html', 
                               show_results=True, 
                               preview=preview_html,
                               initial_rows=initial_count, 
                               cleaned_rows=cleaned_count,
                               filename=file.filename)
    except Exception as e:
        return f"Erreur : {str(e)}", 500

@app.route('/logout')
def logout():
    session.pop('user', None)
    return redirect(url_for('login'))

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 10000))
    app.run(host='0.0.0.0', port=port)