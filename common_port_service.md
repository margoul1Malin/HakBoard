# Liste des ports communs et services associés

Cette liste de référence contient les ports TCP/UDP les plus couramment utilisés et les services qui leur sont généralement associés. Elle peut être utile lors de l'analyse des résultats de scan réseau.

## Ports TCP courants

| Port | Service | Description |
|------|---------|-------------|
| 20 | FTP-DATA | Protocole de transfert de fichiers (données) |
| 21 | FTP | Protocole de transfert de fichiers (contrôle) |
| 22 | SSH | Secure Shell |
| 23 | TELNET | Telnet - accès terminal non sécurisé |
| 25 | SMTP | Simple Mail Transfer Protocol |
| 53 | DNS | Domain Name System |
| 80 | HTTP | HyperText Transfer Protocol |
| 110 | POP3 | Post Office Protocol v3 |
| 111 | RPC | Remote Procedure Call |
| 135 | MSRPC | Microsoft RPC |
| 139 | NETBIOS-SSN | NetBIOS Session Service |
| 143 | IMAP | Internet Message Access Protocol |
| 443 | HTTPS | HTTP Secure (HTTP over TLS/SSL) |
| 445 | SMB | Server Message Block (Windows File Sharing) |
| 993 | IMAPS | IMAP over TLS/SSL |
| 995 | POP3S | POP3 over TLS/SSL |
| 1433 | MS-SQL | Microsoft SQL Server |
| 1521 | ORACLE | Oracle Database |
| 3306 | MYSQL | MySQL Database |
| 3389 | RDP | Remote Desktop Protocol |
| 5432 | POSTGRESQL | PostgreSQL Database |
| 5900 | VNC | Virtual Network Computing |
| 5985 | WINRM | Windows Remote Management (HTTP) |
| 5986 | WINRM | Windows Remote Management (HTTPS) |
| 8080 | HTTP-ALT | HTTP Alternate (souvent utilisé pour les proxies) |
| 8443 | HTTPS-ALT | HTTPS Alternate |

## Ports UDP courants

| Port | Service | Description |
|------|---------|-------------|
| 53 | DNS | Domain Name System |
| 67 | DHCP | Dynamic Host Configuration Protocol (serveur) |
| 68 | DHCP | Dynamic Host Configuration Protocol (client) |
| 69 | TFTP | Trivial File Transfer Protocol |
| 123 | NTP | Network Time Protocol |
| 137 | NETBIOS-NS | NetBIOS Name Service |
| 138 | NETBIOS-DGM | NetBIOS Datagram Service |
| 161 | SNMP | Simple Network Management Protocol |
| 162 | SNMPTRAP | SNMP Traps |
| 500 | ISAKMP | Internet Security Association and Key Management Protocol (IPsec) |
| 514 | SYSLOG | System Logging Protocol |
| 520 | RIP | Routing Information Protocol |
| 1900 | UPNP | Universal Plug and Play |

## Ports dangereux et vulnérabilités courantes

| Port | Service | Risque potentiel |
|------|---------|------------------|
| 23 | TELNET | Transmission en clair des identifiants |
| 25 | SMTP | Relais ouvert, spam |
| 135-139 | MSRPC/NETBIOS | Nombreuses vulnérabilités Windows historiques |
| 445 | SMB | Vulnérabilités comme EternalBlue (WannaCry) |
| 1433-1434 | MS-SQL | Attaques par force brute, injection SQL |
| 3389 | RDP | BlueKeep et autres vulnérabilités RDP |
| 5800-5900 | VNC | Accès non autorisé si mal configuré |

## Conseils pour l'analyse de ports

1. **Ports ouverts inutiles** : Tout port ouvert qui n'est pas nécessaire au fonctionnement du système représente une surface d'attaque potentielle.

2. **Versions obsolètes** : Vérifiez les versions des services détectés. Les versions obsolètes peuvent contenir des vulnérabilités connues.

3. **Services sur des ports non standard** : Méfiez-vous des services fonctionnant sur des ports inhabituels, cela peut indiquer une tentative de contournement des pare-feu.

4. **Empreinte du système d'exploitation** : L'analyse des ports ouverts peut révéler le système d'exploitation utilisé, ce qui peut aider à identifier des vulnérabilités spécifiques.

5. **Ports éphémères** : Les ports au-dessus de 49152 sont généralement des ports éphémères utilisés temporairement pour les connexions sortantes.

## Ressources supplémentaires

- [Base de données des ports IANA](https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml)
- [Common Vulnerabilities and Exposures (CVE)](https://cve.mitre.org/)
- [NIST National Vulnerability Database](https://nvd.nist.gov/) 