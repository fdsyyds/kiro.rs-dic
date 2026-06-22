# 部署复盘与快速更新手册

这个文档给下一次更新用：先看这里，再动服务器。

## 这次为什么更新慢

1. 只同步了前端文件，漏掉了配套的 `api / types / hooks` 文件。

   新页面引用了 `usePoolStatus`、`useRpm`、`PoolStatusResponse`、`RpmResponse` 等类型和 hook，但服务器源码里的这些文件还是旧版本，导致 Docker 前端构建时报 `has no exported member`。

2. 后端源码没有一起同步。

   前端已经调用 `/api/admin/rpm`，但服务器上的后端源码一开始没有对应路由，部署后 `/api/admin/rpm` 返回 404。正确做法是前端依赖后端新接口时，必须同时同步 `src/`。

3. 用 Windows zip 上传 `src` 时保留了反斜杠路径。

   Linux 服务器上解压后变成了类似 `src/admin\router.rs` 的文件名，而不是 `src/admin/router.rs` 目录结构，导致源码目录异常。以后不要用 Windows `Compress-Archive` 直接打包 Rust 源码给 Linux 解压。

4. 部署后配置文件被写回默认值。

   服务一度监听到 `127.0.0.1:8080`，公网 `8990` 访问失败。需要部署后立刻确认：

   ```bash
   ss -ltnp | grep 8990
   ```

5. 构建失败后没有第一时间回到“完整源码一致性”检查。

   下次遇到前端构建缺 export、后端 API 404，要先确认服务器源码是否和本地一致，而不是继续单点补文件。

## 下次最快更新流程

### 1. 本地先确认改动范围

```powershell
git -C repo-compare/dic status --short
git -C repo-compare/dic diff --stat
```

如果改动包含前端页面、API、类型、hook，至少同步这些目录：

```text
admin-ui/src
src
```

### 2. 本地先跑类型检查

```powershell
cd C:\Users\Administrator\Desktop\001\repo-compare\dic\admin-ui
npm install --ignore-scripts
npx tsc -b
```

检查完成后清理临时文件，避免污染仓库：

```powershell
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Force package-lock.json, tsconfig.tsbuildinfo -ErrorAction SilentlyContinue
```

### 3. 同步源码到服务器

推荐优先用 `git` 在服务器上更新，避免漏文件。

如果服务器不能直接拉 Git，就用 `pscp` 同步整个目录。不要用 Windows zip 打包 `src` 后直接 Linux 解压。

服务器信息：

```text
项目目录：/opt/kiro.rs-admin
服务名：kiro-rs
管理端口：8990
配置文件：/opt/kiro.rs-admin/data/config.json
凭据文件：/opt/kiro.rs-admin/data/credentials.json
```

敏感信息不要写进本文件：SSH 密码、管理 Key、API Key 从安全记录或对话上下文取。

### 4. 服务器构建

```bash
cd /opt/kiro.rs-admin
docker build -t kiro-rs-admin-local .
```

构建必须看到前端 `vite build` 成功，以及 Rust `Finished release`。

### 5. 替换二进制并重启

```bash
cd /opt/kiro.rs-admin
ts=$(date +%Y%m%d%H%M%S)
cp target/release/kiro-rs target/release/kiro-rs.bak.$ts

cid=$(docker create kiro-rs-admin-local)
docker cp $cid:/app/kiro-rs target/release/kiro-rs.new
docker rm $cid

chmod +x target/release/kiro-rs.new
mv target/release/kiro-rs.new target/release/kiro-rs
systemctl restart kiro-rs
```

### 6. 必须验证

```bash
systemctl is-active kiro-rs
ss -ltnp | grep 8990
curl -fsS http://127.0.0.1:8990/admin | head
curl -fsS -H "Authorization: Bearer <管理Key>" http://127.0.0.1:8990/api/admin/pool-status
curl -fsS -H "Authorization: Bearer <管理Key>" http://127.0.0.1:8990/api/admin/rpm
```

公网也要验证：

```powershell
curl.exe --max-time 10 -i http://167.88.177.117:8990/admin
curl.exe --max-time 10 -H "Authorization: Bearer <管理Key>" http://167.88.177.117:8990/api/admin/rpm
```

## 下次你可以这样直接命令我

把下面这段发给我就行：

```text
按 DEPLOY_RUNBOOK.md 更新服务器：
1. 先看 git diff，判断前端/后端/类型/hook 是否都要同步。
2. 本地跑 admin-ui 的 npx tsc -b。
3. 同步完整必要源码到 /opt/kiro.rs-admin。
4. docker build -t kiro-rs-admin-local .
5. 替换 target/release/kiro-rs，重启 kiro-rs。
6. 验证 8990、/admin、/api/admin/pool-status、/api/admin/rpm。
7. 不要把密码或 Key 写进仓库文件。
```

## 快速判断问题

| 现象 | 优先检查 |
| --- | --- |
| 前端构建缺 export | 服务器 `admin-ui/src/api`、`types`、`hooks` 是否同步 |
| `/api/admin/rpm` 404 | 服务器 `src/admin/router.rs` 和后端源码是否同步 |
| 服务 active 但公网 8990 不通 | `config.json` 的 `host/port` 和 `ss -ltnp` |
| SSH 慢或断开 | 先确认 `8990/admin` 是否正常，再从控制台重启 `ssh/sshd` |
| 刚重启 RPM 为 0 | 正常，RPM 是近一分钟窗口统计 |
