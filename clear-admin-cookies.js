// Admin Cookie Clear Script
document.cookie = 'admin_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
console.log('🗑️ Admin Cookie gelöscht');
window.location.href = '/admin';
