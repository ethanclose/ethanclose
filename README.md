#
# ethanclose.com website
#

Static site (HTML, CSS, vanilla JS) for Cloudflare Pages. No framework.

## Content

- **Photos**: put photos in `assets/images/<Album Title>/`. The folder name is the album title and
  the first file (sorted by name) is the cover. Then regenerate the manifest:

  ```
  node scripts/generate-manifest.mjs
  ```

  Static hosts can't list folders, so the page reads `assets/images/manifest.json`. Commit the
  regenerated file, or set the command as the Cloudflare Pages build command
  (framework preset: None, build output directory: `/`).
- **Videos**: edit `assets/videos/oaklandojos.txt`, one `landscape|portrait,title,youtube-url` per line.
- **Signup**: the popup and the Contact page mailing list post to Formspree (`SIGNUP_ENDPOINT` at the top
  of `assets/js/site.js`). The contact message form on `contact.html` uses its own Formspree form.
  The popup shows once, 5 seconds after a first visit, and can be toggled any time from **Sign Up**
  in the nav.

## Local preview

```
python3 -m http.server 8765 --bind 127.0.0.1
```

Open <http://127.0.0.1:8765/>. To preview from a phone on the same Wi-Fi, drop `--bind 127.0.0.1`
and open `http://<your-ip>:8765/`. No build step and no dependencies.

