import os
import io
import pandas as pd
import numpy as np
from flask import Flask, render_template, request, send_file, jsonify, redirect, url_for, session

app = Flask(__name__)
# Clé secrète pour les sessions utilisateur
app.secret_key = os.environ.get('SECRET_KEY', 'datacleaner_secret_key_2026')

# --- AUTHENTIFICATION ---

@app.route('/')
def index():
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    error = None
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        # Identifiants statiques pour la sécurité et simplicité sur Render
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

# --- DASHBOARD & VISUALISATION ---

@app.route('/dashboard')
def dashboard():
    if 'user' not in session:
        return redirect(url_for('login'))
    return render_template('landing.html')

@app.route('/process', methods=['POST'])
def process_file():
    if 'user' not in session:
        return redirect(url_for('login'))

    if 'file' not in request.files:
        return "Aucun fichier détecté", 400
    
    file = request.files['file']
    if file.filename == '':
        return "Fichier vide", 400

    filename = file.filename.lower()

    try:
        # 1. LECTURE MULTI-FORMAT
        if filename.endswith('.csv'):
            df = pd.read_csv(file)
        elif filename.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(file)
        elif filename.endswith('.json'):
            df = pd.read_json(file)
        elif filename.endswith('.xml'):
            df = pd.read_xml(file)
        else:
            return "Format non supporté", 400

        # 2. GÉNÉRATION DE L'APERÇU (Les 10 premières lignes)
        # On transforme le DataFrame en tableau HTML pour l'affichage
        preview_html = df.head(10).to_html(classes='table table-striped table-hover', index=False)
        
        # 3. STATISTIQUES POUR LE DESIGN
        rows, cols = df.shape
        columns_list = df.columns.tolist()
        
        # On renvoie les données vers landing.html pour affichage interactif
        return render_template('landing.html', 
                               preview=preview_html, 
                               rows=rows, 
                               cols=cols, 
                               columns=columns_list,
                               filename=file.filename)

    except Exception as e:
        return f"Erreur lors de l'analyse : {str(e)}", 500

# --- ACTION DE NETTOYAGE & TÉLÉCHARGEMENT ---

@app.route('/download', methods=['POST'])
def download_cleaned():
    # Ici, on simule le nettoyage complet pour le téléchargement final
    file = request.files.get('file') # Dans une version réelle, on stockerait le DF en cache
    # Pour la démo, on applique un nettoyage standard rapide :
    try:
        # (Logique simplifiée pour la démo de téléchargement)
        # On suppose que le fichier est renvoyé ou on traite le dernier uploadé
        return "Action de nettoyage confirmée. Fichier prêt.", 200
    except:
        return "Erreur de traitement", 500

# --- CONFIGURATION DU PORT POUR RENDER ---

if __name__ == '__main__':
    # Indispensable pour que Render détecte le port HTTP
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)