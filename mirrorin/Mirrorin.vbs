' mirrorin - launcher tanpa jendela console (jalankan via WScript, window disembunyikan)
Option Explicit

Dim fso, shell, here, pyw, main, vbsPath
Set shell = CreateObject("WScript.Shell")

here = Left(WScript.ScriptFullName, InStrRev(WScript.ScriptFullName, "\"))

pyw  = shell.ExpandEnvironmentStrings("%LOCALAPPDATA%") & "\Programs\Python\Python313\pythonw.exe"
If Not (fso = Nothing) Then
    If Not CreateObject("Scripting.FileSystemObject").FileExists(pyw) Then
        pyw = "pythonw.exe"
    End If
End If

main = here & "main.py"

' 0 = jalankan tanpa jendela
shell.CurrentDirectory = here
shell.Run """" & pyw & """ """ & main & """", 0, False