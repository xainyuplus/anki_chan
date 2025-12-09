// 设置管理
async function loadSettings() {
    try {
        const res = await fetch("/api/settings");
        if (!res.ok) throw new Error("Failed to fetch settings");

        const settings = await res.json();
        AppState.settings = settings;

        renderModels(settings.models);
        renderRoles(settings.roles);
    } catch (err) {
        console.error("loadSettings error:", err);
        alert("Failed to load settings");
    }
}

function renderModels(models) {
    const tbody = document.querySelector("#modelsTable tbody");
    tbody.innerHTML = "";

    if (!models) return;

    Object.keys(models).forEach(key => {
        const m = models[key];
        const tr = document.createElement("tr");

        tr.innerHTML = `
          <td><input class="model-key-input" value="${key}"></td>
          <td><input class="model-display-input" value="${m.displayName || ""}"></td>
          <td><input class="model-env-input" value="${m.apiKeyEnvName || ""}"></td>
          <td><input class="model-baseurl-input" value="${m.baseURL || ""}"></td>
          <td><input class="model-name-input" value="${m.model || ""}"></td>
          <td><input class="model-temp-input" type="number" step="0.1" value="${m.temperature ?? 0.7}"></td>
          <td><button type="button" class="delete-model-btn">X</button></td>
        `;

        tbody.appendChild(tr);
    });
}
function renderRoles(roles) {
    const tbody = document.querySelector("#rolesTable tbody");
    tbody.innerHTML = "";

    if (!roles) return;

    const models = AppState.settings?.models || {};
    const modelKeys = Object.keys(models);

    Object.keys(roles).forEach(key => {
        const r = roles[key];

        const tr = document.createElement("tr");

        // 先 innerHTML 基础结构
        tr.innerHTML = `
          <td><input class="role-key-input" value="${key}"></td>
          <td><input class="role-display-input" value="${r.displayName || ""}"></td>
          <td>
            <select class="role-model-select"></select>
          </td>
          <td><textarea class="role-system-input" rows="3">${r.template?.system || ""}</textarea></td>
          <td><textarea class="role-user-input" rows="3">${r.template?.user || ""}</textarea></td>
          <td><button type="button" class="delete-role-btn">X</button></td>
        `;

        // 填充 model 下拉选项
        const select = tr.querySelector(".role-model-select");
        modelKeys.forEach(mKey => {
            const opt = document.createElement("option");
            opt.value = mKey;
            opt.textContent = models[mKey].displayName || mKey;
            if (mKey === r.model) opt.selected = true;
            select.appendChild(opt);
        });

        tbody.appendChild(tr);
    });
}
function addEmptyModelRow() {
    const tbody = document.querySelector("#modelsTable tbody");
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input class="model-key-input" value=""></td>
      <td><input class="model-display-input" value=""></td>
      <td><input class="model-env-input" value=""></td>
      <td><input class="model-baseurl-input" value=""></td>
      <td><input class="model-name-input" value=""></td>
      <td><input class="model-temp-input" type="number" step="0.1" value="0.7"></td>
      <td><button type="button" class="delete-model-btn">X</button></td>
    `;
    tbody.appendChild(tr);
}

function addEmptyRoleRow() {
    const tbody = document.querySelector("#rolesTable tbody");
    const models = AppState.settings?.models || {};
    const modelKeys = Object.keys(models);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input class="role-key-input" value=""></td>
      <td><input class="role-display-input" value=""></td>
      <td><select class="role-model-select"></select></td>
      <td><textarea class="role-system-input" rows="3"></textarea></td>
      <td><textarea class="role-user-input" rows="3"></textarea></td>
      <td><button type="button" class="delete-role-btn">X</button></td>
    `;

    const select = tr.querySelector(".role-model-select");
    modelKeys.forEach(mKey => {
        const opt = document.createElement("option");
        opt.value = mKey;
        opt.textContent = models[mKey].displayName || mKey;
        select.appendChild(opt);
    });

    tbody.appendChild(tr);
}
document.querySelector("#modelsTable").addEventListener("click", e => {
    if (e.target.classList.contains("delete-model-btn")) {
        const tr = e.target.closest("tr");
        tr.remove();
    }
});

document.querySelector("#rolesTable").addEventListener("click", e => {
    if (e.target.classList.contains("delete-role-btn")) {
        const tr = e.target.closest("tr");
        tr.remove();
    }
});
function collectModelsFromTable() {
    const tbody = document.querySelector("#modelsTable tbody");
    const models = {};

    tbody.querySelectorAll("tr").forEach(tr => {
        const key = tr.querySelector(".model-key-input").value.trim();
        if (!key) return; // 跳过空行

        models[key] = {
            displayName: tr.querySelector(".model-display-input").value.trim(),
            apiKeyEnvName: tr.querySelector(".model-env-input").value.trim(),
            baseURL: tr.querySelector(".model-baseurl-input").value.trim(),
            model: tr.querySelector(".model-name-input").value.trim(),
            temperature: parseFloat(tr.querySelector(".model-temp-input").value) || 0.7
        };
    });

    return models;
}

function collectRolesFromTable() {
    const tbody = document.querySelector("#rolesTable tbody");
    const roles = {};

    tbody.querySelectorAll("tr").forEach(tr => {
        const key = tr.querySelector(".role-key-input").value.trim();
        if (!key) return;

        roles[key] = {
            displayName: tr.querySelector(".role-display-input").value.trim(),
            model: tr.querySelector(".role-model-select").value,
            template: {
                system: tr.querySelector(".role-system-input").value,
                user: tr.querySelector(".role-user-input").value
            }
        };
    });

    return roles;
}
async function saveSettings() {
    try {
        const defaultModelSelect = document.getElementById("defaultModelSelect");
        const defaultModel = defaultModelSelect.value;

        const models = collectModelsFromTable();
        const roles = collectRolesFromTable();

        const payload = {
            defaultModel,
            models,
            roles
        };

        const res = await fetch("/api/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error("Failed to save settings");

        AppState.settings = payload;
        alert("Settings saved!");
    } catch (err) {
        console.error("saveSettings error:", err);
        alert("Failed to save settings");
    }
}