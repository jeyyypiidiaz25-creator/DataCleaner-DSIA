import os
import io
import pandas as pd
import numpy as np
from flask import Flask, render_template, request, send_file, jsonify, redirect, url_for, session

app = Flask(__name__)
# Clé secrète pour gérer la session admin
app.secret_key = os.environ.get('SECRET_KEY', 'votre_cle_secrete_dsia_2026')

# --- 1. AUTHENTIFICATION ---

@app.route('/')
def index():
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    error = None
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        # Identifiants statiques pour la démo
        if username == "admin" and password == "admin123":
            session['user'] = username
            return redirect(url_for('dashboard'))
        else:
            error = "Identifiants invalides"
    return render_template('login.html', error=error)

@app.route('/logout')
def logout():
    session.pop('user', None)
    return redirect(url_for('login'))

# --- 2. DASHBOARD & TRAITEMENT DES DONNÉES ---

@app.route('/dashboard')
def dashboard():
    if 'user' not in session:
        return redirect(url_for('login'))
    # État initial : on affiche la page sans résultats
    return render_template('landing.html', show_results=False)

@app.route('/process', methods=['POST'])
def process_file():
    if 'user' not in session:
        return redirect(url_for('login'))

    file = request.files.get('file')
    if not file or file.filename == '':
        return "Aucun fichier sélectionné", 400

    try:
        # Lecture du fichier (CSV ou Excel)
        if file.filename.lower().endswith('.csv'):
            df = pd.read_csv(file)
        else:
            df = pd.read_excel(file)

        # --- LOGIQUE DE STATISTIQUES (Image 13) ---
        initial_count = len(df)
        
        # Simulation d'un nettoyage (suppression des doublons et des lignes vides)
        df_cleaned = df.drop_duplicates().dropna(how='all')
        cleaned_count = len(df_cleaned)
        
        # Génération de l'aperçu HTML (10 premières lignes)
        preview_html = df_cleaned.head(10).to_html(
            classes='table table-striped table-hover', 
            index=False,
            border=0
        )

        # Envoi des données vers le template
        return render_template(
            'landing.html',
            show_results=True,
            preview=preview_html,
            initial_rows=initial_count,
            cleaned_rows=cleaned_count,
            filename=file.filename,
            cols=len(df.columns)
        )

    except Exception as e:
        return f"Erreur lors du traitement : {str(e)}", 500

# --- 3. LANCEMENT RENDER ---

if __name__ == '__main__':
    # Configuration du port pour l'hébergement Cloud
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)