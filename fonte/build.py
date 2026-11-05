import sys, pathlib
root = pathlib.Path(__file__).parent
shell = (root/'src/shell.html').read_text()
css = (root/'src/styles.css').read_text()
js = '\n'.join((root/'src'/f).read_text() for f in ['parsers.js','core.js','ui.js','sheets.js'])
out = shell.replace('/*CSS*/', css).replace('/*JS*/', js)
(root/'dist').mkdir(exist_ok=True)
(root/'dist/index.html').write_text(out.replace('<!--PWA-->',''))
pwa = '''<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<link rel="icon" type="image/png" href="icons/icon-192.png">'''
sw = "<script>if('serviceWorker' in navigator && location.protocol==='https:'){addEventListener('load',function(){navigator.serviceWorker.register('sw.js').catch(function(){})})}</script>\n</body>"
pages = out.replace('<!--PWA-->', pwa).replace('</body>', sw, 1) if False else out.replace('<!--PWA-->', pwa)
pages = pages[::-1].replace('</body>'[::-1], sw[::-1], 1)[::-1]
(root/'dist/pages').mkdir(exist_ok=True)
(root/'dist/pages/index.html').write_text(pages)
print('ok', len(out)//1024, 'KB')
