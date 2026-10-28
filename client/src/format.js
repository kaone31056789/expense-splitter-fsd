export const money = (n) => 'Rs ' + Number(n).toFixed(2);

export const initials = (name) => name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

const AV_COLORS = ['#1f4d3a', '#7c3f1d', '#2f3e73', '#6b2c4a', '#5a5a1f', '#1f5a5a', '#4a3a6b', '#7a2e22'];
export const avColor = (id) => AV_COLORS[(id - 1) % AV_COLORS.length];

export const sortedMembers = (g) => [...g.members].sort((a, b) => a.id - b.id);

export const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
