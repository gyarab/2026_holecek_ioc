# FoxPass

Šifrovaný správce hesel pro webový prohlížeč Mozilla Firefox (Manifest V3).

## Technologie
- **Šifrování:** Lokální AES-256-GCM.
- **Derivace klíče:** PBKDF2 (100 000 iterací, SHA-256, 16 B sůl, 12 B IV).
- **Backend:** Supabase (REST API).
- **Koncepce:** Zero-knowledge architektura.

## Instalace pro vývojáře
1. Otevřete prohlížeč Firefox a do adresního řádku zadejte `about:debugging`.
2. V levém panelu vyberte **Tento prohlížeč** (This Firefox).
3. Klikněte na **Načíst dočasný doplněk** a vyberte `manifest.json` ze složky projektu.

---
<sub>*Tento dokument byl navržen s využitím umělé inteligence v rámci přípravy ročníkové práce.*</sub>
