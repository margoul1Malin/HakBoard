// Script PowerShell WinPEAS exporté comme une chaîne de caractères JavaScript
const winPEASScript = `
# Version améliorée de WinPEAS pour éviter les détections
Write-Host "=== WinPEAS - Windows Privilege Escalation Awesome Script ==="
Write-Host "Exécution de la version intégrée de WinPEAS..."

# Fonction pour vérifier les permissions ACL
function Start-ACLCheck {
  param(
    $Target, $ServiceName)
  # Gather ACL of object
  if ($null -ne $target) {
    try {
      $ACLObject = Get-Acl $target -ErrorAction SilentlyContinue
    }
    catch { $null }
    
    # If Found, Evaluate Permissions
    if ($ACLObject) { 
      $Identity = @()
      $Identity += "$env:COMPUTERNAME\\$env:USERNAME"
      if ($ACLObject.Owner -like $Identity ) { Write-Host "$Identity has ownership of $Target" -ForegroundColor Red }
      # This should now work for any language. Command runs whoami group, removes the first two line of output, converts from csv to object, but adds "group name" to the first column.
      whoami.exe /groups /fo csv | select-object -skip 2 | ConvertFrom-Csv -Header 'group name' | Select-Object -ExpandProperty 'group name' | ForEach-Object { $Identity += $_ }
      $IdentityFound = $false
      foreach ($i in $Identity) {
        $permission = $ACLObject.Access | Where-Object { $_.IdentityReference -like $i }
        $UserPermission = ""
        switch -WildCard ($Permission.FileSystemRights) {
          "FullControl" { 
            $userPermission = "FullControl"
            $IdentityFound = $true 
          }
          "Write*" { 
            $userPermission = "Write"
            $IdentityFound = $true 
          }
          "Modify" { 
            $userPermission = "Modify"
            $IdentityFound = $true 
          }
        }
        Switch ($permission.RegistryRights) {
          "FullControl" { 
            $userPermission = "FullControl"
            $IdentityFound = $true 
          }
        }
        if ($UserPermission) {
          if ($ServiceName) { Write-Host "$ServiceName found with permissions issue:" -ForegroundColor Red }
          Write-Host -ForegroundColor red "Identity $($permission.IdentityReference) has '$userPermission' perms for $Target"
        }
      }    
      # Identity Found Check - If False, loop through and stop at root of drive
      if ($IdentityFound -eq $false) {
        if ($Target.Length -gt 3) {
          $Target = Split-Path $Target
          Start-ACLCheck $Target -ServiceName $ServiceName
        }
      }
    }
    else {
      # If not found, split path one level and Check again
      $Target = Split-Path $Target
      Start-ACLCheck $Target $ServiceName
    }
  }
}

# Fonction pour vérifier les chemins de service non cités
function UnquotedServicePathCheck {
  Write-Host "Fetching the list of services, this may take a while..."
  $services = Get-WmiObject -Class Win32_Service | 
    Where-Object { $_.PathName -inotmatch '^"' -and $_.PathName -inotmatch ":\\\\Windows\\\\" -and ($_.StartMode -eq "Auto" -or $_.StartMode -eq "Manual") -and ($_.State -eq "Running" -or $_.State -eq "Stopped") }
  if ($($services | Measure-Object).Count -lt 1) {
    Write-Host "No unquoted service paths were found"
  }
  else {
    $services | ForEach-Object {
      Write-Host "Unquoted Service Path found!" -ForegroundColor red
      Write-Host "Name: $($_.Name)"
      Write-Host "PathName: $($_.PathName)"
      Write-Host "StartName: $($_.StartName)" 
      Write-Host "StartMode: $($_.StartMode)"
      Write-Host "Running: $($_.State)"
    } 
  }
}

# Informations système de base
Write-Host "\`n[+] Informations système"
Write-Host "------------------------"
$computerSystem = Get-CimInstance CIM_ComputerSystem
$computerBIOS = Get-CimInstance CIM_BIOSElement
$computerOS = Get-CimInstance CIM_OperatingSystem
$computerCPU = Get-CimInstance CIM_Processor
$computerHDD = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID = 'C:'"

Write-Host "Nom de l'ordinateur: $($computerSystem.Name)"
Write-Host "Fabricant: $($computerSystem.Manufacturer)"
Write-Host "Modèle: $($computerSystem.Model)"
Write-Host "BIOS: $($computerBIOS.Manufacturer) $($computerBIOS.Name) $($computerBIOS.Version)"
Write-Host "Système d'exploitation: $($computerOS.Caption) $($computerOS.Version)"
Write-Host "Architecture: $($computerOS.OSArchitecture)"
Write-Host "CPU: $($computerCPU.Name)"
Write-Host "Espace disque: $("{0:N2}" -f ($computerHDD.Size/1GB)) GB (Libre: $("{0:N2}" -f ($computerHDD.FreeSpace/1GB)) GB)"

# Vérification des correctifs Windows
Write-Host "\`n[+] Correctifs Windows"
Write-Host "------------------------"
$hotfixes = Get-HotFix | Sort-Object -Descending -Property InstalledOn | Select-Object -First 10
$hotfixes | ForEach-Object {
    Write-Host "  - $($_.HotFixID) - $($_.Description) - Installé le: $($_.InstalledOn)"
}

# Utilisateurs et groupes
Write-Host "\`n[+] Utilisateurs et groupes"
Write-Host "------------------------"
Write-Host "Utilisateur actuel: $env:USERNAME"
Write-Host "Groupes de l'utilisateur actuel:"
$currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent()
$currentUser.Groups | ForEach-Object {
    $group = $_.Translate([System.Security.Principal.NTAccount])
    Write-Host "  - $($group.Value)"
}

# Vérifier si l'utilisateur est administrateur
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
Write-Host "Administrateur: $isAdmin"

# Utilisateurs locaux
Write-Host "\`nUtilisateurs locaux:"
Get-LocalUser | ForEach-Object {
    Write-Host "  - $($_.Name) (Activé: $($_.Enabled))"
}

# Groupes locaux
Write-Host "\`nGroupes locaux:"
Get-LocalGroup | ForEach-Object {
    Write-Host "  - $($_.Name)"
}

# Administrateurs locaux
Write-Host "\`nMembres du groupe Administrateurs:"
Get-LocalGroupMember -Group "Administrateurs" -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host "  - $($_.Name)"
}

# Vérification des paramètres UAC
Write-Host "\`n[+] Paramètres UAC"
Write-Host "------------------------"
$uacStatus = (Get-ItemProperty HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System).EnableLUA
if ($uacStatus -eq 1) {
    Write-Host "UAC est activé (EnableLUA = 1)"
} else {
    Write-Host "UAC est désactivé (EnableLUA = 0)" -ForegroundColor Red
}

$consentPrompt = (Get-ItemProperty HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System).ConsentPromptBehaviorAdmin
Write-Host "Niveau de notification UAC (ConsentPromptBehaviorAdmin): $consentPrompt"
switch ($consentPrompt) {
    0 { Write-Host "  - Élévation sans notification (vulnérable)" -ForegroundColor Red }
    1 { Write-Host "  - Demande d'informations d'identification sur l'écran sécurisé" }
    2 { Write-Host "  - Demande de consentement sur l'écran sécurisé" }
    3 { Write-Host "  - Demande d'informations d'identification" }
    4 { Write-Host "  - Demande de consentement" }
    5 { Write-Host "  - Demande de consentement pour les programmes non-Windows" }
}

# Vérification AlwaysInstallElevated
Write-Host "\`n[+] Vérification AlwaysInstallElevated"
Write-Host "------------------------"
$hklmInstallElevated = (Get-ItemProperty HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\Installer -ErrorAction SilentlyContinue).AlwaysInstallElevated
$hkcuInstallElevated = (Get-ItemProperty HKCU:\\SOFTWARE\\Policies\\Microsoft\\Windows\\Installer -ErrorAction SilentlyContinue).AlwaysInstallElevated

if ($hklmInstallElevated -eq 1 -and $hkcuInstallElevated -eq 1) {
    Write-Host "AlwaysInstallElevated est activé (vulnérable)" -ForegroundColor Red
} else {
    Write-Host "AlwaysInstallElevated n'est pas activé"
}

# Services vulnérables
Write-Host "\`n[+] Services vulnérables"
Write-Host "------------------------"
Write-Host "Services avec chemins non cités:"
Get-WmiObject -Class Win32_Service | Where-Object { 
    $_.PathName -ne $null -and $_.PathName -notmatch '^"' -and $_.PathName -match ' ' 
} | ForEach-Object {
    Write-Host "  - $($_.Name): $($_.PathName)" -ForegroundColor Red
}

# Vérification des permissions sur les services
Write-Host "\`n[+] Vérification des permissions sur les services"
Write-Host "------------------------"
$UniqueServices = @{}
Get-WmiObject Win32_Service | Where-Object { $_.PathName -like '*.exe*' } | ForEach-Object {
  $Path = ($_.PathName -split '(?<=\\.exe\\b)')[0].Trim('"')
  $UniqueServices[$Path] = $_.Name
}
foreach ($h in ($UniqueServices | Select-Object -Unique).GetEnumerator()) {
  Start-ACLCheck -Target $h.Name -ServiceName $h.Value
}

# Tâches planifiées
Write-Host "\`n[+] Tâches planifiées"
Write-Host "------------------------"
Get-ScheduledTask | Where-Object { $_.State -ne "Disabled" } | ForEach-Object {
    Write-Host "  - $($_.TaskName) (Chemin: $($_.TaskPath))"
}

# Processus en cours d'exécution
Write-Host "\`n[+] Processus en cours d'exécution"
Write-Host "------------------------"
Get-Process | Sort-Object -Property CPU -Descending | Select-Object -First 10 | ForEach-Object {
    Write-Host "  - $($_.ProcessName) (PID: $($_.Id), CPU: $($_.CPU))"
}

# Partages réseau
Write-Host "\`n[+] Partages réseau"
Write-Host "------------------------"
Get-WmiObject -Class Win32_Share | ForEach-Object {
    Write-Host "  - $($_.Name) (Chemin: $($_.Path))"
}

# Connexions réseau
Write-Host "\`n[+] Connexions réseau"
Write-Host "------------------------"
Get-NetTCPConnection | Where-Object { $_.State -eq "Established" } | ForEach-Object {
    $process = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue
    Write-Host "  - $($_.LocalAddress):$($_.LocalPort) -> $($_.RemoteAddress):$($_.RemotePort) (Processus: $($process.ProcessName))"
}

# Vérification des mots de passe stockés
Write-Host "\`n[+] Vérification des mots de passe stockés"
Write-Host "------------------------"

# Vérification des informations d'identification Windows
Write-Host "\`nInformations d'identification Windows:"
cmdkey.exe /list | ForEach-Object {
    Write-Host "  - $_"
}

# Vérification des mots de passe dans Winlogon
Write-Host "\`nMots de passe dans Winlogon:"
$winlogon = Get-ItemProperty "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Winlogon" -ErrorAction SilentlyContinue
if ($winlogon.DefaultPassword) {
    Write-Host "  - DefaultPassword trouvé: $($winlogon.DefaultPassword)" -ForegroundColor Red
}
if ($winlogon.DefaultUserName) {
    Write-Host "  - DefaultUserName trouvé: $($winlogon.DefaultUserName)"
}
if ($winlogon.AutoAdminLogon -eq "1") {
    Write-Host "  - AutoAdminLogon est activé" -ForegroundColor Red
}

# Recherche de mots de passe dans le registre
Write-Host "\`n[+] Recherche de mots de passe dans le registre"
Write-Host "------------------------"
$regPaths = @(
    "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\Currentversion\\Winlogon",
    "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\RunOnce",
    "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run",
    "HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run",
    "HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\RunOnce"
)

foreach ($path in $regPaths) {
    Write-Host "Vérification de $path"
    Get-ItemProperty -Path $path -ErrorAction SilentlyContinue | ForEach-Object {
        $properties = $_ | Get-Member -MemberType NoteProperty | Where-Object { $_.Name -notmatch '^PS' }
        foreach ($prop in $properties) {
            $value = $_."$($prop.Name)"
            if ($value -match "password|pwd|pass|cred|key|secret" -or $prop.Name -match "password|pwd|pass|cred|key|secret") {
                Write-Host "  - $($prop.Name): $value" -ForegroundColor Red
            }
        }
    }
}

# Vérification des fichiers de configuration non sécurisés
Write-Host "\`n[+] Vérification des fichiers de configuration non sécurisés"
Write-Host "------------------------"
$unattendedFiles = @(
    "C:\\Windows\\sysprep\\sysprep.xml",
    "C:\\Windows\\sysprep\\sysprep.inf",
    "C:\\Windows\\sysprep.inf",
    "C:\\Windows\\Panther\\Unattended.xml",
    "C:\\Windows\\Panther\\Unattend.xml",
    "C:\\Windows\\Panther\\Unattend\\Unattend.xml",
    "C:\\Windows\\Panther\\Unattend\\Unattended.xml",
    "C:\\Windows\\System32\\Sysprep\\unattend.xml",
    "C:\\Windows\\System32\\Sysprep\\unattended.xml",
    "C:\\unattend.txt",
    "C:\\unattend.inf"
)

foreach ($file in $unattendedFiles) {
    if (Test-Path $file) {
        Write-Host "  - Fichier trouvé: $file" -ForegroundColor Red
        Get-Content $file | Select-String -Pattern "password|pwd|pass|cred" | ForEach-Object {
            Write-Host "    - $_" -ForegroundColor Red
        }
    }
}

# Fichiers intéressants
Write-Host "\`n[+] Fichiers intéressants"
Write-Host "------------------------"
$interestingFiles = @(
    "$env:USERPROFILE\\AppData\\Roaming\\Microsoft\\Windows\\PowerShell\\PSReadLine\\ConsoleHost_history.txt",
    "$env:USERPROFILE\\.aws\\credentials",
    "$env:USERPROFILE\\.azure\\credentials",
    "$env:USERPROFILE\\.ssh\\id_rsa",
    "$env:USERPROFILE\\.ssh\\id_dsa",
    "$env:USERPROFILE\\.ssh\\id_ecdsa",
    "$env:USERPROFILE\\.ssh\\id_ed25519",
    "$env:USERPROFILE\\.ssh\\config",
    "$env:USERPROFILE\\.bash_history",
    "$env:USERPROFILE\\.zsh_history",
    "$env:USERPROFILE\\Desktop\\*.txt",
    "$env:USERPROFILE\\Desktop\\*.ini",
    "$env:USERPROFILE\\Desktop\\*.xml",
    "$env:USERPROFILE\\Desktop\\*.conf",
    "$env:USERPROFILE\\Desktop\\*.config",
    "$env:USERPROFILE\\Desktop\\*.cfg",
    "$env:USERPROFILE\\Documents\\*.txt",
    "$env:USERPROFILE\\Documents\\*.ini",
    "$env:USERPROFILE\\Documents\\*.xml",
    "$env:USERPROFILE\\Documents\\*.conf",
    "$env:USERPROFILE\\Documents\\*.config",
    "$env:USERPROFILE\\Documents\\*.cfg",
    "C:\\inetpub\\wwwroot\\web.config",
    "C:\\Windows\\System32\\drivers\\etc\\hosts"
)

foreach ($file in $interestingFiles) {
    if (Test-Path $file) {
        Write-Host "  - $file" -ForegroundColor Green
    }
}

# Vérification des applications installées
Write-Host "\`n[+] Applications installées"
Write-Host "------------------------"
Get-WmiObject -Class Win32_Product | Select-Object -First 20 | ForEach-Object {
    Write-Host "  - $($_.Name) - $($_.Version)"
}

# Vérification des variables d'environnement
Write-Host "\`n[+] Variables d'environnement"
Write-Host "------------------------"
Get-ChildItem env: | ForEach-Object {
    Write-Host "  - $($_.Name): $($_.Value)"
}

Write-Host "\`n[+] Analyse terminée"
Write-Host "------------------------"
Write-Host "WinPEAS a terminé son analyse. Vérifiez les résultats ci-dessus pour identifier les vulnérabilités potentielles."
`;

export default winPEASScript; 