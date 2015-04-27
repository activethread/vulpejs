// I18N
module.exports = function(options) {
  if (!options.i18n) {
    options.i18n = {
      locales: ['pt', 'en', 'es'],
      defaultLocale: 'pt',
      cookie: 'appLanguage',
      indent: '  ',
      directory: root.dir + '/locales'
    };
  }
  vulpejs.i18n.configure(options.i18n);
  vulpejs.express.app.use(vulpejs.i18n.init);
  return vulpejs.i18n;
};