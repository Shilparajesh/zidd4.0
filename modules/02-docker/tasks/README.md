# Docker Tasks · Step-by-Step Commands

> ZiDD 4.0 · DevOps Jadeja ([@devops_jadeja](https://www.instagram.com/devops_jadeja/))

This page is the **complete walkthrough** for the Docker hands-on tasks. Run the commands **one by one**, from top to bottom. After each command, compare what you see with the **Expected** line.

| Task | What you prove | Files needed |
|---|---|---|
| [Task 2 · Volumes and networks](#task-2--volumes-and-networks) | Data survives a deleted container, and containers find each other by name | None |
| [Task 3 · Make the image better, then ship it](#task-3--make-the-image-better-then-ship-it) | A cached, non-root, health-checked image, pushed to Docker Hub | [`app/`](app/) |

> Task 1 is not here: it uses the workshop repo from the recording ([docker-zidd3](https://github.com/jadeja-rajpal/docker-zidd3)).

```
tasks/
├── README.md          ← you are here
└── app/               ← used in Task 3
    ├── Dockerfile
    ├── .dockerignore
    ├── package.json
    ├── package-lock.json
    └── server.js
```

---

## Before you start

Check that Docker is installed and running:

```bash
docker version
docker run --rm hello-world
```
**Expected:** `Hello from Docker!`

> **Linux:** if you get `permission denied`, run `sudo usermod -aG docker $USER`, then log out and log back in.

---

## Task 2 · Volumes and networks

### Part A · Volumes: data survives a deleted container

**Step 1.** Create a volume called `mydata`.
```bash
docker volume create mydata
```
**Expected:** `mydata`

**Step 2.** Check that it exists.
```bash
docker volume ls
```
**Expected:** a line with `local     mydata`

**Step 3.** Run a container that writes a file into the volume. `--rm` deletes the container as soon as it finishes.
```bash
docker run --rm -v mydata:/data alpine sh -c 'echo "hello from zidd" > /data/note.txt'
```
**Expected:** no output. The container is already gone. Check with `docker ps -a`.

**Step 4.** Run a **brand-new** container with the same volume and read the file.
```bash
docker run --rm -v mydata:/data alpine cat /data/note.txt
```
**Expected:** `hello from zidd` ✅ The file survived, even though the container that wrote it was deleted.

**Step 5.** See where Docker keeps the volume on your machine.
```bash
docker volume inspect mydata
```
**Expected:** JSON with `"Mountpoint": "/var/lib/docker/volumes/mydata/_data"`

---

### Part B · Networks: containers find each other by name

**Step 1.** Create a network called `zidd-net`.
```bash
docker network create zidd-net
```
**Expected:** a long network ID

**Step 2.** Run nginx with the name `web` on that network. Notice there is **no `-p`**, so no port is open on your machine.
```bash
docker run -d --name web --network zidd-net nginx:alpine
```
**Expected:** a long container ID

**Step 3.** Check it is running.
```bash
docker ps
```
**Expected:** `web` with status `Up`, and **nothing** in the PORTS column except `80/tcp`

**Step 4.** From a second container **on the same network**, call `web` **by its name**.
```bash
docker run --rm --network zidd-net alpine wget -qO- http://web
```
**Expected:** the nginx page HTML, with `<title>Welcome to nginx!</title>` ✅

**Step 5.** Try the same from a container that is **not** on `zidd-net`.
```bash
docker run --rm alpine wget -qO- -T 5 http://web
```
**Expected:** `wget: bad address 'web'` ✅ This is the default `bridge` network, which has no name resolution.

**Step 6.** See who is connected to the network.
```bash
docker network inspect zidd-net
```
**Expected:** under `"Containers"` you see `web` with its IP address

> **Why does this work?** A **user-defined network** has Docker's built-in DNS, so a container's **name** is its hostname. The default `bridge` network doesn't have this. That is why Docker Compose always creates its own network, and why `DB_HOST: db` just works.

### Task 2 · Clean up

```bash
docker rm -f web
docker network rm zidd-net
docker volume rm mydata
```
**Expected:** each command prints the name it removed

---

## Task 3 · Make the image better, then ship it

All commands in this task run **inside the `app` folder**:
```bash
cd app
```

Open the [`Dockerfile`](app/Dockerfile) first. Every improvement is commented:

| # | Improvement | Why |
|---|---|---|
| 1 | `FROM node:22-alpine` | Small, pinned base image, not `latest` |
| 2 | `COPY package*.json` **before** `COPY . .` | The slow `npm ci` layer stays cached when only code changes |
| 3 | `.dockerignore` | `node_modules` and `.git` never go into the image |
| 4 | `USER node` | The app does not run as root |
| 5 | `HEALTHCHECK` | Docker knows if the app is really working |
| 6 | `CMD ["node", "server.js"]` | Exec form, so the app shuts down cleanly on `docker stop` |

### Part A · Build and run it

**Step 1.** Build the image.
```bash
docker build -t zidd-dashboard:1.0 .
```
**Expected:** ends with `naming to docker.io/library/zidd-dashboard:1.0`

**Step 2.** Check the image and its size.
```bash
docker images zidd-dashboard
```
**Expected:** `zidd-dashboard   1.0   ...   ~170MB`

**Step 3.** Run it in the background.
```bash
docker run -d --name dashboard -p 3000:3000 zidd-dashboard:1.0
```
**Expected:** a long container ID

**Step 4.** Call the health endpoint. You can also open `http://localhost:3000` in your browser.
```bash
curl localhost:3000/api/health
```
**Expected:** `{"status":"UP","container":"...","time":"..."}` ✅

**Step 5.** Prove it does **not** run as root.
```bash
docker exec dashboard whoami
```
**Expected:** `node` ✅ (not `root`)

**Step 6.** Wait about 15 seconds, then check the health status.
```bash
docker ps
```
**Expected:** STATUS shows `Up ... (healthy)` ✅

**Step 7.** Read the app logs.
```bash
docker logs dashboard
```
**Expected:** `listening on port 3000`

**Step 8.** Look at the layers of your image.
```bash
docker history zidd-dashboard:1.0
```
**Expected:** one line per Dockerfile step, newest at the top

---

### Part B · Watch the layer cache work

**Step 1.** Change one line of code: open `server.js` and change the `MESSAGE` text to anything you like.

**Step 2.** Rebuild with a new tag.
```bash
docker build -t zidd-dashboard:1.1 .
```
**Expected:** the steps up to and including `RUN npm ci` show **`CACHED`**. Only `COPY . .` and the steps after it run again ✅

> **Why?** Docker reuses a layer if nothing before it changed. `package.json` didn't change, so the slow install is skipped. If you had put `COPY . .` before `npm ci`, every code change would reinstall all the packages.

**Step 3.** Swap the running container for the new version.
```bash
docker rm -f dashboard
docker run -d --name dashboard -p 3000:3000 zidd-dashboard:1.1
curl localhost:3000
```
**Expected:** your new message ✅

---

### Part C · Ship it to Docker Hub

You need a free account at [hub.docker.com](https://hub.docker.com). In the commands below, replace **`YOUR_USER`** with your Docker Hub username.

**Step 1.** Log in.
```bash
docker login
```
**Expected:** `Login Succeeded`

**Step 2.** Tag the image with your username and a **version**. Never ship only `latest`.
```bash
docker tag zidd-dashboard:1.1 YOUR_USER/zidd-dashboard:1.0
```
**Expected:** no output. Check with `docker images`.

**Step 3.** Push it.
```bash
docker push YOUR_USER/zidd-dashboard:1.0
```
**Expected:** each layer shows `Pushed`, then `1.0: digest: sha256:...` ✅

**Step 4.** Delete the container and **every local copy** of the image.
```bash
docker rm -f dashboard
docker rmi YOUR_USER/zidd-dashboard:1.0 zidd-dashboard:1.0 zidd-dashboard:1.1
```
**Expected:** `Untagged: ...` and `Deleted: sha256:...`

**Step 5.** Run it again. Docker must **pull it from Docker Hub**, because it's no longer on your machine.
```bash
docker run -d --name dashboard -p 3000:3000 YOUR_USER/zidd-dashboard:1.0
```
**Expected:** `Unable to find image ... locally`, then `Pulling from YOUR_USER/zidd-dashboard` ✅

**Step 6.** Check it works.
```bash
curl localhost:3000/api/health
```
**Expected:** `{"status":"UP",...}` ✅

Open `https://hub.docker.com/r/YOUR_USER/zidd-dashboard` and you should see the `1.0` tag.

### Task 3 · Clean up

```bash
docker rm -f dashboard
docker rmi YOUR_USER/zidd-dashboard:1.0
cd ..
```

---

## ✅ Done checklist

- [ ] A file in a volume survived a deleted container
- [ ] `web` was reachable by name inside `zidd-net`, and **not** from outside it
- [ ] My image runs as `node`, not `root`
- [ ] `docker ps` showed `(healthy)`
- [ ] A code change rebuilt with `npm ci` **CACHED**
- [ ] My image is on Docker Hub, and I pulled it back down

Stuck? Write down the command, what you expected and what you got, and bring it to the **Saturday or Sunday live doubt session**.

---

⬅️ [Back to Module 02: Docker](../README.md)

---

<p align="center"><sub>© 2026 <b>DevOps Jadeja</b> (<a href="https://www.instagram.com/devops_jadeja/">@devops_jadeja</a>) · ZiDD 4.0<br>All content, images and code in this repo are for enrolled ZiDD 4.0 students only. Do not copy, resell or republish without written permission. See <a href="../../../LICENSE">LICENSE</a>.</sub></p>
