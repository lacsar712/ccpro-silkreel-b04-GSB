import { render } from "preact";
import { useEffect, useState } from "preact/hooks";
import { api, clearToken, setToken, token } from "./api.js";
import {
  NOTE_MAX_HANZI,
  NOTE_MIN_HANZI,
  NOTE_REQUIRED_PHRASE,
  hanziCount,
  noteError,
} from "./notes.js";
import "./app.css";

const STATUS_LABEL = { soaking: "浸茧", reeling: "缫丝中", reeled: "已缫完" };
const ROUTE_RING = "#/";
const ROUTE_NOTES = "#/notes";

function Login({ onOk }) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("123456");
  const [err, setErr] = useState("");
  async function submit(e) {
    e.preventDefault();
    setErr("");
    try {
      const data = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      setToken(data.access_token);
      onOk();
    } catch (ex) {
      setErr(ex.message);
    }
  }
  return (
    <div class="login">
      <h1>江口缫丝坞</h1>
      <p>汤温环盆作业台，不是列表台账。</p>
      <form onSubmit={submit} autocomplete="off">
        <label>
          用户名
          <input name="username" autocomplete="off" value={username} onInput={(e) => setUsername(e.target.value)} />
        </label>
        <label>
          密码
          <input name="password" type="password" autocomplete="off" value={password} onInput={(e) => setPassword(e.target.value)} />
        </label>
        <p class="hint">已预填 admin / 123456，另有 worker / 123456</p>
        <button type="submit">登录</button>
      </form>
      {err && <p class="err">{err}</p>}
    </div>
  );
}

// 抽屉与盆笔记专页共用的编辑器：同一套本地规矩，且最终以后端闸门为准。
function BasinNoteEditor({ basin, onSaved }) {
  const [text, setText] = useState(basin.notes || "");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  // 切换盆或库里的笔记变化时，输入框以库里的内容为准重置。
  useEffect(() => {
    setText(basin.notes || "");
    setErr("");
    setOk("");
  }, [basin.id, basin.notes]);

  const count = hanziCount(text);
  async function save() {
    setErr("");
    setOk("");
    // 抽屉/专页先拦：缺字或缺「东津渡」根本不发请求，库里的旧笔记原样保留。
    const bad = noteError(text);
    if (bad) {
      setErr(bad);
      return;
    }
    try {
      const row = await api(`/api/basins/${basin.id}/notes`, {
        method: "POST",
        body: JSON.stringify({ notes: text }),
      });
      // 喊成功必须库里真有：页面状态一律用服务端回来的盆数据覆盖。
      onSaved(row);
      setOk("笔记已落库");
    } catch (ex) {
      setErr(ex.message);
    }
  }

  return (
    <div class="note-editor">
      <h4>盆笔记</h4>
      <p class="hint">
        规矩：汉字 {NOTE_MIN_HANZI}～{NOTE_MAX_HANZI} 字，正文须出现「{NOTE_REQUIRED_PHRASE}
        」；缺字或缺这四个字整笔打回，不先入库。
      </p>
      <textarea
        rows="3"
        value={text}
        onInput={(e) => setText(e.target.value)}
        placeholder={`写够 ${NOTE_MIN_HANZI} 个汉字，并写明「东津渡」`}
      />
      <p class="note-count">
        汉字 {count} / {NOTE_MIN_HANZI}～{NOTE_MAX_HANZI}
      </p>
      <button onClick={save}>存笔记</button>
      {err && <p class="err">{err}</p>}
      {ok && <p class="ok">{ok}</p>}
    </div>
  );
}

function TopNav({ route, filature, riverside }) {
  return (
    <div class="topbar">
      <div>
        <h1>{filature}</h1>
        <p>{riverside} · 已缫完须最近汤温 38～42℃；盆笔记须 8～40 汉字且含「东津渡」</p>
      </div>
      <nav class="topnav">
        <a class={route === ROUTE_RING ? "active" : ""} href={ROUTE_RING}>
          环盆作业台
        </a>
        <a class={route === ROUTE_NOTES ? "active" : ""} href={ROUTE_NOTES}>
          盆笔记
        </a>
        <button
          onClick={() => {
            clearToken();
            location.reload();
          }}
        >
          退出
        </button>
      </nav>
    </div>
  );
}

function RingYard({ board, picked, setPicked, patchBasin }) {
  const [temp, setTemp] = useState("40");
  const [err, setErr] = useState("");

  const n = board.basins.length;
  async function writeTemp() {
    setErr("");
    try {
      const row = await api(`/api/basins/${picked.id}/readings`, {
        method: "POST",
        body: JSON.stringify({ waterTempC: Number(temp) }),
      });
      patchBasin(row);
      setPicked(row);
    } catch (ex) {
      setErr(ex.message);
    }
  }
  async function setStatus(status) {
    setErr("");
    try {
      const row = await api(`/api/basins/${picked.id}/status`, {
        method: "POST",
        body: JSON.stringify({ status }),
      });
      patchBasin(row);
      setPicked(row);
    } catch (ex) {
      setErr(ex.message);
    }
  }

  return (
    <div>
      <div class="ring">
        {board.basins.map((b, i) => {
          const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
          const left = 50 + Math.cos(angle) * 38;
          const top = 50 + Math.sin(angle) * 38;
          return (
            <button
              key={b.id}
              class={`basin ${b.status}`}
              style={{ left: `${left}%`, top: `${top}%` }}
              onClick={() => setPicked(b)}
            >
              <strong>{b.code}</strong>
              <span>{STATUS_LABEL[b.status]}</span>
            </button>
          );
        })}
      </div>
      {picked && (
        <div class="drawer">
          <h3>
            {picked.code} · {STATUS_LABEL[picked.status]}
          </h3>
          <p>最近汤温：{picked.latestTempC ?? "无"} ℃ · 记录 {picked.readingCount} 次</p>
          <input value={temp} onInput={(e) => setTemp(e.target.value)} />
          <button onClick={writeTemp}>登记汤温</button>
          <div>
            <button onClick={() => setStatus("soaking")}>浸茧</button>
            <button onClick={() => setStatus("reeling")}>缫丝中</button>
            <button onClick={() => setStatus("reeled")}>已缫完</button>
          </div>
          <hr />
          <BasinNoteEditor basin={picked} onSaved={(row) => { patchBasin(row); setPicked(row); }} />
          {err && <p class="err">{err}</p>}
        </div>
      )}
    </div>
  );
}

function NotesPage({ board, picked, setPicked, patchBasin }) {
  return (
    <div class="notes-page">
      <h2>盆笔记专页</h2>
      <p class="hint">与环盆抽屉同一套规矩、同一个落库口。</p>
      <div class="note-tabs">
        {board.basins.map((b) => (
          <button
            key={b.id}
            class={picked && picked.id === b.id ? "tab active" : "tab"}
            onClick={() => setPicked(b)}
          >
            {b.code}
          </button>
        ))}
      </div>
      {picked && (
        <div class="drawer">
          <h3>
            {picked.code} · {STATUS_LABEL[picked.status]}
          </h3>
          <BasinNoteEditor basin={picked} onSaved={(row) => { patchBasin(row); setPicked(row); }} />
        </div>
      )}
    </div>
  );
}

function Shell({ route }) {
  const [board, setBoard] = useState(null);
  const [picked, setPicked] = useState(null);
  const [err, setErr] = useState("");

  async function refresh() {
    const data = await api("/api/board");
    setBoard(data);
    setPicked((cur) => cur
      ? data.basins.find((b) => b.id === cur.id) || data.basins[0]
      : data.basins[0]);
  }

  useEffect(() => {
    refresh().catch((e) => setErr(e.message));
  }, []);

  function patchBasin(row) {
    setBoard((cur) =>
      cur ? { ...cur, basins: cur.basins.map((b) => (b.id === row.id ? row : b)) } : cur
    );
  }

  if (!board) {
    return <div class="yard">{err || "装载环盆…"}</div>;
  }

  return (
    <div class="yard">
      <TopNav route={route} filature={board.filature} riverside={board.riverside} />
      {route === ROUTE_NOTES ? (
        <NotesPage board={board} picked={picked} setPicked={setPicked} patchBasin={patchBasin} />
      ) : (
        <RingYard board={board} picked={picked} setPicked={setPicked} patchBasin={patchBasin} />
      )}
    </div>
  );
}

function App() {
  const [ready, setReady] = useState(Boolean(token()));
  const [route, setRoute] = useState(() =>
    location.hash === ROUTE_NOTES ? ROUTE_NOTES : ROUTE_RING
  );

  useEffect(() => {
    const onHash = () =>
      setRoute(location.hash === ROUTE_NOTES ? ROUTE_NOTES : ROUTE_RING);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  return ready ? <Shell route={route} /> : <Login onOk={() => setReady(true)} />;
}

render(<App />, document.getElementById("app"));
