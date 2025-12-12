# Troubleshooting Guide - NOT_FOUND Error

## Problem: NOT_FOUND error on neurostint.rs

### ⚠️ VAŽNO: Ako je radilo pre onemogućavanja automatskog deploy-a

Ako je sajt radio pre nego što smo onemogućili automatski deploy, problem je verovatno u tome što:
1. Domen je bio povezan sa starim automatskim deployment-om
2. Novi deployment preko GitHub Actions možda nije povezan sa domenom

### Brzo rešenje:

#### Opcija 1: Privremeno ukloni Ignored Build Step
1. Idi na: Vercel Dashboard → Project → Settings → Git
2. U "Ignored Build Step" sekciji, promeni na "Automatic" (ili ukloni postavku)
3. Push-uj nešto na main branch da pokreneš automatski deploy:
   ```bash
   git commit --allow-empty -m "Trigger auto-deploy to reconnect domain"
   git push origin main
   ```
4. Sačekaj da se deployment završi (nekoliko minuta)
5. Proveri da li domen radi
6. Ako radi, domen će biti povezan sa novim deployment-om
7. Zatim možeš ponovo postaviti "Don't build anything" u Ignored Build Step

#### Opcija 2: Proveri i dodeli domen production deployment-u
1. Idi na: Vercel Dashboard → Project → Deployments
2. Pronađi poslednji uspešan deployment (status: "Ready")
3. Idi na: Project → Settings → Domains
4. Klikni na `neurostint.rs`
5. Proveri da li je dodeljen production deployment-u
6. Ako nije, dodeli ga production deployment-u

### Checklist - Proveri ovo u Vercel Dashboard:

#### 1. **Proveri da li je domen povezan sa projektom**
   - Idi na: Vercel Dashboard → Project → Settings → Domains
   - Proveri da li `neurostint.rs` (i `www.neurostint.rs` ako koristiš) postoji u listi
   - Ako ne postoji:
     - Klikni "Add Domain"
     - Unesi `neurostint.rs`
     - Sledi uputstva za DNS konfiguraciju

#### 2. **Proveri DNS konfiguraciju**
   - Domen mora da ima pravilno podešene DNS zapise
   - Vercel će ti dati DNS zapise koje treba da dodaš kod svog DNS provider-a
   - Proveri da li su DNS zapisi propagirani (može potrajati 24-48h)

#### 3. **Proveri da li je deployment uspešan**
   - Idi na: Vercel Dashboard → Project → Deployments
   - Proveri poslednji deployment:
     - ✅ Ako je "Ready" - deployment je uspešan
     - ❌ Ako je "Error" ili "Failed" - proveri build logs

#### 4. **Proveri build logs**
   - Otvori poslednji deployment
   - Klikni na "Build Logs"
   - Proveri da li ima grešaka:
     - Build errors
     - Missing dependencies
     - Configuration errors

#### 5. **Proveri da li je domen dodeljen production deployment-u**
   - Idi na: Vercel Dashboard → Project → Settings → Domains
   - Klikni na `neurostint.rs`
   - Proveri da li je dodeljen "Production" deployment-u
   - Ako nije, dodeli ga production deployment-u

#### 6. **Proveri Root Directory postavku**
   - Idi na: Project Settings → General
   - **Root Directory:** Treba da bude **potpuno prazno** ako je kod u root direktorijumu
     - ⚠️ **Ne koristi** `.` ili `./` - Vercel će prikazati grešku
     - Prazno polje znači root direktorijum repozitorijuma
   - Ako je pogrešno podešeno, Vercel neće moći da nađe `package.json` i `vercel.json`

#### 7. **Proveri routing konfiguraciju**
   - `vercel.json` već ima rewrites konfigurisane
   - Proveri da li Vercel prepoznaje `vercel.json`:
     - Idi na: Project Settings → General
     - Proveri da li se `vercel.json` koristi

### Rešenja:

#### Rešenje 1: Privremeno ukloni Ignored Build Step (preporučeno ako je radilo pre)
1. Idi na Vercel Dashboard → Project → Settings → Git
2. Ukloni komandu iz "Ignored Build Step" (ostavi prazno)
3. Push-uj nešto na main:
   ```bash
   git commit --allow-empty -m "Trigger auto-deploy to reconnect domain"
   git push origin main
   ```
4. Sačekaj da se deployment završi
5. Proveri da li domen radi
6. Ako radi, ponovo postaviti "Don't build anything" u Ignored Build Step

#### Rešenje 2: Dodaj domen u Vercel
1. Idi na Vercel Dashboard → Project → Settings → Domains
2. Klikni "Add Domain"
3. Unesi `neurostint.rs`
4. Sledi uputstva za DNS konfiguraciju

#### Rešenje 3: Proveri deployment status
1. Idi na Vercel Dashboard → Project → Deployments
2. Ako poslednji deployment nije uspešan:
   - Proveri build logs
   - Re-deploy-uj projekat:
     ```bash
     npm run deploy -- 1.0.3
     ```

#### Rešenje 4: Proveri da li je domen pravilno konfigurisan
- DNS zapisi moraju biti pravilno podešeni
- A record ili CNAME record mora da pokazuje na Vercel
- Proveri DNS propagaciju: https://dnschecker.org/

### Česti problemi:

1. **DNS nije propagiran**
   - Rešenje: Sačekaj 24-48h ili proveri DNS zapise

2. **Domen nije dodeljen production deployment-u**
   - Rešenje: Dodeli domen production deployment-u u Vercel Settings

3. **Build pada**
   - Rešenje: Proveri build logs i ispravi greške

4. **Routing problem**
   - Rešenje: `vercel.json` već ima rewrites, ali proveri da li se koristi

5. **Domen nije povezan sa novim deployment-om**
   - Rešenje: Privremeno ukloni Ignored Build Step i push-uj na main da se domen poveže

### Kontakt Vercel Support:
Ako ništa od navedenog ne pomaže, kontaktiraj Vercel Support sa:
- Project URL
- Domain name
- Deployment ID
- Build logs (ako ima grešaka)
