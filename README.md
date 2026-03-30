# FoxPass

[span_0](start_span)[span_1](start_span)[span_2](start_span)Šifrovaný správce hesel pro prohlížeč Mozilla Firefox využívající specifikaci Manifest V3[span_0](end_span)[span_1](end_span)[span_2](end_span).

## Architektura a technologie
* **[span_3](start_span)[span_4](start_span)[span_5](start_span)Kryptografie:** Lokální šifrování standardem AES-256 v režimu GCM[span_3](end_span)[span_4](end_span)[span_5](end_span). [span_6](start_span)[span_7](start_span)[span_8](start_span)[span_9](start_span)Derivace dešifrovacího klíče probíhá přes PBKDF2 (100 000 iterací, hash SHA-256) za použití 16bajtové kryptografické soli a 12bajtového inicializačního vektoru[span_6](end_span)[span_7](end_span)[span_8](end_span)[span_9](end_span).
* **[span_10](start_span)Web Crypto API:** Hardwarově urychlené nativní rozhraní prohlížeče pro kryptografické operace[span_10](end_span).
* **[span_11](start_span)[span_12](start_span)[span_13](start_span)Backend (BaaS):** Cloudová databáze Supabase komunikující přes REST API pomocí formátu JSON[span_11](end_span)[span_12](end_span)[span_13](end_span).
* **[span_14](start_span)[span_15](start_span)[span_16](start_span)Koncepce:** Zero-knowledge architektura minimalizující riziko úniku dat na straně serveru[span_14](end_span)[span_15](end_span)[span_16](end_span).

## Instalace a zprovoznění
1. [span_17](start_span)V prohlížeči Firefox zadejte do adresního řádku `about:debugging`[span_17](end_span).
2. [span_18](start_span)V levém menu přejděte na „Tento prohlížeč“[span_18](end_span).
3. [span_19](start_span)Klikněte na „Načíst dočasný doplněk“ a vyberte soubor `manifest.json`[span_19](end_span).

## Základní funkce
* **[span_20](start_span)Autentizace:** Registrace a přihlašování uživatelů proti databázi Supabase[span_20](end_span).
* **[span_21](start_span)[span_22](start_span)Správa trezoru:** Zápis, lokální šifrování a následné odeslání datových sad (site, login, pass) přes metody POST a PATCH[span_21](end_span)[span_22](end_span). [span_23](start_span)Při přihlášení se datový balíček stáhne přes GET a dešifruje[span_23](end_span).
* **[span_24](start_span)Ukončení relace:** Funkce odhlášení zajišťuje výmaz citlivých dat z lokálního úložiště a paměti RAM[span_24](end_span).

## Známé bezpečnostní nedostatky
[span_25](start_span)Soubor `popup.js` aktuálně obsahuje kritickou zranitelnost[span_25](end_span). [span_26](start_span)Po úspěšné autentizaci se hlavní uživatelské heslo ukládá do úložiště `firefox.storage.local` v prostém textu, což zcela narušuje koncept PBKDF2 ochrany před lokálním útočníkem[span_26](end_span).

---
*Tento text byl vygenerován s využitím umělé inteligence a slouží jako readme.md pro individuální odbornou činnost.*
