/* Discord profile card powered by the free Lanyard API.
   One-time setup: join https://discord.gg/lanyard with your Discord account so it can see your presence. */
(function () {
  const USER_ID = '1311652776580874260';
  const $ = id => document.getElementById(id);
  const avatar = $('discord-avatar'), link = $('discord-link');
  if (!avatar) return;
  const initials = avatar.querySelector('span'), img = avatar.querySelector('img'), dot = avatar.querySelector('.dc-dot');
  const nameEl = $('dc-name'), subEl = $('dc-sub'), tagEl = $('dc-tag');
  const STATUS = { online: 'Online', idle: 'Idle', dnd: 'Do not disturb', offline: 'Offline' };
  const KEY = 'discord-last-online';

  function ago(ms) {
    const m = Math.max(1, Math.round(ms / 60000));
    if (m < 60) return m + ' min ago';
    const h = Math.round(m / 60);
    if (h < 48) return h + ' hr ago';
    return Math.round(h / 24) + ' days ago';
  }
  function lastSeen() {
    try { const t = +localStorage.getItem(KEY); if (t) return 'Last seen ' + ago(Date.now() - t); } catch (e) {}
    return 'Offline';
  }
  function activityText(list) {
    const a = (list || []).find(x => x.type === 2 || x.type === 0);   // Spotify / game
    if (!a) return '';
    return a.type === 2 ? 'Listening to ' + (a.details || a.name) : 'Playing ' + a.name;
  }

  async function update() {
    try {
      const res = await fetch('https://api.lanyard.rest/v1/users/' + USER_ID);
      const json = await res.json();
      if (!json.success) return;                       // not in the Lanyard server yet: card keeps its fallback
      const d = json.data, u = d.discord_user, status = d.discord_status;

      nameEl.textContent = u.global_name || u.display_name || u.username || nameEl.textContent;
      if (u.avatar) {
        img.onload = () => { img.hidden = false; initials.hidden = true; };
        img.src = 'https://cdn.discordapp.com/avatars/' + USER_ID + '/' + u.avatar + '.' + (u.avatar.startsWith('a_') ? 'gif' : 'png') + '?size=128';
      }
      dot.dataset.status = status;

      // Server tag (the little "NEXT" pill), shown only if you have one equipped
      const g = u.primary_guild;
      if (g && g.tag) {
        tagEl.querySelector('b').textContent = g.tag;
        const b = tagEl.querySelector('img');
        if (g.badge && g.identity_guild_id) b.src = 'https://cdn.discordapp.com/guild-tag-badges/' + g.identity_guild_id + '/' + g.badge + '.png?size=32';
        else b.hidden = true;
        tagEl.hidden = false;
      }

      if (status !== 'offline') { try { localStorage.setItem(KEY, Date.now()); } catch (e) {} }
      subEl.textContent = status === 'offline' ? lastSeen() : (activityText(d.activities) || STATUS[status]);
      link.setAttribute('aria-label', 'Discord: ' + nameEl.textContent + ' (' + STATUS[status] + ')');
    } catch (e) { /* offline or blocked: keep fallback */ }
  }

  subEl.textContent = lastSeen();
  update();
  setInterval(() => { if (!document.hidden) update(); }, 30000);
})();