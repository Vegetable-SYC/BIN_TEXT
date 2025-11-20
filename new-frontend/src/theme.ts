// theme.ts

export function initializeThemes() {
    const savedTheme = localStorage.getItem('firmware-installer-theme') || 'theme-blue';
    document.body.className = savedTheme;

    function setTheme(themeName: string) {
        document.body.className = themeName;
        localStorage.setItem('firmware-installer-theme', themeName);
    }

    document.getElementById('btn-blue')?.addEventListener('click', () => setTheme('theme-blue'));
    document.getElementById('btn-dark')?.addEventListener('click', () => setTheme('theme-dark'));
    document.getElementById('btn-light')?.addEventListener('click', () => setTheme('theme-light'));
    document.getElementById('btn-pink')?.addEventListener('click', () => setTheme('theme-pink'));
}
