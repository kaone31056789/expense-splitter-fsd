"""Regenerates docs/LAB_RECORD.md from the current source files. Run: python docs/build_lab_record.py"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SKIP = {"node_modules", "dist", ".git", ".vercel"}
LANG = {".js": "javascript", ".jsx": "jsx", ".json": "json", ".css": "css", ".html": "html"}


def files_under(folder, exts):
    return sorted(p for p in (ROOT / folder).rglob("*")
                  if p.is_file() and p.suffix in exts and not SKIP & set(p.relative_to(ROOT).parts))


def block(path):
    rel = path.relative_to(ROOT).as_posix()
    text = path.read_text(encoding="utf-8").rstrip()
    return f"### {rel}\n\n```{LANG.get(path.suffix, '')}\n{text}\n```\n"


def demote(md):
    # Turn the headings of an included document into lower-level ones
    return "\n".join("#" + line if line.startswith("#") else line for line in md.splitlines())


tree = sorted(p.relative_to(ROOT).as_posix() for p in ROOT.rglob("*")
              if p.is_file() and not SKIP & set(p.relative_to(ROOT).parts) and p.suffix not in {".docx", ".pdf"}
              and "package-lock" not in p.name)

out = ["# Lab Record - Expense Splitter (React + Node.js/Express)\n",
       "## 1. Project folder structure\n", "```", *(f"expense-splitter/{t}" for t in tree), "```\n",
       "## 2. Build and deployment files\n"]
for name in ["package.json", "server/package.json", "client/package.json", "client/vite.config.js", "vercel.json", "api/index.js"]:
    out.append(block(ROOT / name))

out.append("## 3. Backend source code (server/src)\n")
out += [block(p) for p in files_under("server/src", {".js"})]
out.append("## 4. Backend tests (server/test)\n")
out += [block(p) for p in files_under("server/test", {".js"})]
out.append("## 5. Frontend source code (client)\n")
out.append(block(ROOT / "client/index.html"))
out += [block(p) for p in files_under("client/src", {".js", ".jsx", ".css"})]
out.append("## 6. Postman test sequence\n")
out.append(demote((ROOT / "docs/POSTMAN_TESTS.md").read_text(encoding="utf-8")) + "\n")
out.append("## 7. README\n")
out.append(demote((ROOT / "README.md").read_text(encoding="utf-8")) + "\n")

(ROOT / "docs/LAB_RECORD.md").write_text("\n".join(out), encoding="utf-8")
print("wrote docs/LAB_RECORD.md")
