import os
import psycopg2
import pandas as pd
from flask import Flask, render_template, request, redirect, url_for, session, send_file
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.secret_key = 'votre_cle_secrete_ici'  # Changez ceci pour la sécurité

# --- CONFIGURATION BASE DE DONNÉES ---
def get_db_connection():
    # Utilise l'URL de Render si disponible, sinon les paramètres par défaut
    db_url = os.environ.get('DATABASE_URL')
    if db_url:
        conn = psycopg2.connect(db_url)
    else:
        conn = psycopg2.connect(
            host="dpg-d6f1k1450q8c73b5lmqg-a.frankfurt-postgres.render.com",
            database="db_datacleaner",
            user="db_datacleaner_user",
            password="3vv7A10uUdfDUX9emtowq3rLak0QIu9y"
        )
    return conn

# --- INITIALISATION AUTOMATIQUE ---
def init_db():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        # Création table Utilisateurs
        cur.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL
            );
        """)
        # Création table Historique
        cur.execute("""
            CREATE TABLE IF NOT EXISTS traitements (
                id SERIAL PRIMARY KEY,
                nom_fichier VARCHAR(255) NOT NULL,
                date_traitement TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                lignes_avant INTEGER,
                lignes_apres INTEGER,
                actions TEXT
            );
        """)
        # Création du compte Admin par défaut
        cur.execute("""
            INSERT INTO users (username, password) 
            VALUES ('admin', 'admin123') 
            ON CONFLICT (username) DO NOTHING;
        """)
        conn.commit()
        cur.close()
        conn.close()
        print("✅ Base de données initialisée avec succès !")
    except Exception as e:
        print(f"❌ Erreur lors de l'initialisation : {e}")

# Lancer la création des tables au démarrage
init_db()

# --- ROUTES ---
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM users WHERE username = %s AND password = %s", (username, password))
        user = cur.fetchone()
        cur.close()
        conn.close()
        
        if user:
            session['user'] = username
            return redirect(url_for('dashboard'))
        return "Identifiants incorrects"
    return render_template('login.html')

@app.route('/dashboard')
def dashboard():
    if 'user' not in session:
        return redirect(url_for('login'))
    return render_template('dashboard.html')

@app.route('/logout')
def logout():
    session.pop('user', None)
    return redirect(url_for('index'))

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)