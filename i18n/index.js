// I18N
var i18n = require('i18n');
module.exports = function(options, app) {
  if (!options.i18n) {
    options.i18n = {
      locales: ['pt', 'en', 'es'],
      defaultLocale: 'pt',
      cookie: 'appLanguage',
      indent: '  ',
      directory: global.app.rootDir + '/locales'
    };
  }
  i18n.configure(options.i18n);
  app.use(i18n.init);
  return i18n;
};