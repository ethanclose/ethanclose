#
# ethanclose.com website
#

Static site (HTML, CSS, vanilla JS) for Cloudflare Pages. No framework.

## Content

- **Photos**: hosted in Cloudflare R2 and served from
  `https://images.ethanclose.com/images/<Album Title>/<file>`. The album list and cover data live in
  `assets/images/manifest.json`; update it when adding or removing images. The Night Heron album uses
  its last photo as the cover (see `LAST_PHOTO_COVERS` in `assets/js/images.js`).
- **Videos**: edit `assets/videos/oaklandojos.txt`, one `landscape|portrait,title,youtube-url` per line.
- **Signup**: the popup and the Contact page mailing list post to Formspree (`SIGNUP_ENDPOINT` at the top
  of `assets/js/site.js`). The contact message form on `contact.html` uses its own Formspree form.
  The popup shows once, 5 seconds after a first visit, and can be toggled any time from **sign up**
  in the nav.

## Local preview

```
python3 -m http.server 8765 --bind 127.0.0.1
```

Open <http://127.0.0.1:8765/>. To preview from a phone on the same Wi-Fi, drop `--bind 127.0.0.1`
and open `http://<your-ip>:8765/`. No build step and no dependencies.

