import json
import sys
import traceback

def search_phone_private(phone, api_key):
    """Recherche un numéro de téléphone en utilisant l'API privée LeakCheck (nécessite un plan payant)"""
    try:
        # Importer le module LeakCheck ici pour capturer les erreurs d'importation
        try:
            from leakcheck import LeakCheckAPI_v2
        except ImportError as e:
            return {"error": f"Erreur d'importation du module LeakCheck: {str(e)}"}
        
        # Initialiser l'API avec la clé
        try:
            api = LeakCheckAPI_v2(api_key=api_key)
        except Exception as e:
            return {"error": f"Erreur d'initialisation de l'API LeakCheck: {str(e)}"}
        
        # Effectuer la recherche
        try:
            result = api.lookup(query=phone, query_type="phone", limit=100)
            return result
        except Exception as e:
            error_msg = str(e)
            # Si l'erreur est liée à un plan actif requis, essayer l'API publique
            if "Active plan required" in error_msg:
                return {"error": "Active plan required", "try_public": True}
            return {"error": f"Erreur lors de la recherche: {error_msg}"}
    except Exception as e:
        # Capturer toutes les autres erreurs
        return {"error": f"Erreur inattendue: {str(e)}\n{traceback.format_exc()}"}

def search_phone_public(phone):
    """Recherche un numéro de téléphone en utilisant l'API publique LeakCheck (gratuite)"""
    try:
        # Importer le module LeakCheck ici pour capturer les erreurs d'importation
        try:
            from leakcheck import LeakCheckAPI_Public
        except ImportError as e:
            return {"error": f"Erreur d'importation du module LeakCheck: {str(e)}"}
        
        # Initialiser l'API publique (sans clé)
        try:
            public_api = LeakCheckAPI_Public()
        except Exception as e:
            return {"error": f"Erreur d'initialisation de l'API publique LeakCheck: {str(e)}"}
        
        # Effectuer la recherche
        try:
            result = public_api.lookup(query=phone)
            
            # Formater le résultat pour qu'il soit compatible avec l'interface utilisateur
            if result.get('success') and result.get('found') > 0:
                formatted_result = []
                
                # Créer une entrée pour chaque source
                for source in result.get('sources', []):
                    entry = {
                        'sources': source.get('name', 'Source inconnue'),
                        'last_breach': None,
                        'line': None,
                        'password': None,
                        'is_public_api': True
                    }
                    
                    # Ajouter la date si disponible
                    if 'date' in source:
                        try:
                            # Convertir la date au format "YYYY-MM" en timestamp
                            year, month = source['date'].split('-')
                            import time
                            from datetime import datetime
                            dt = datetime(int(year), int(month), 1)
                            entry['last_breach'] = int(time.mktime(dt.timetuple()))
                        except:
                            pass
                    
                    # Ajouter les champs disponibles
                    for field in result.get('fields', []):
                        entry[field] = f"Présent dans la fuite (détails non disponibles avec l'API publique)"
                    
                    formatted_result.append(entry)
                
                return formatted_result
            elif result.get('success') and result.get('found') == 0:
                return []  # Aucune fuite trouvée
            else:
                return {"error": "Erreur lors de la recherche avec l'API publique"}
        except Exception as e:
            return {"error": f"Erreur lors de la recherche avec l'API publique: {str(e)}"}
    except Exception as e:
        # Capturer toutes les autres erreurs
        return {"error": f"Erreur inattendue avec l'API publique: {str(e)}\n{traceback.format_exc()}"}

if __name__ == "__main__":
    try:
        # Vérifier les arguments
        if len(sys.argv) != 3:
            print(json.dumps({"error": "Usage: python win_phone_leakcheck.py <phone> <api_key>"}))
            sys.exit(1)
        
        phone = sys.argv[1]
        api_key = sys.argv[2]
        
        # D'abord essayer avec l'API privée
        result = search_phone_private(phone, api_key)
        
        # Si l'API privée échoue avec "Active plan required", essayer l'API publique
        if isinstance(result, dict) and result.get("error") and result.get("try_public"):
            print(json.dumps({"info": "Plan payant requis pour l'API privée, utilisation de l'API publique à la place"}))
            result = search_phone_public(phone)
        
        # Afficher le résultat en JSON
        print(json.dumps(result))
        
        # Sortir avec le code approprié
        if isinstance(result, dict) and "error" in result:
            sys.exit(1)
        else:
            sys.exit(0)
    except Exception as e:
        # Capturer toutes les erreurs non gérées
        print(json.dumps({"error": f"Erreur critique: {str(e)}\n{traceback.format_exc()}"}))
        sys.exit(1)
