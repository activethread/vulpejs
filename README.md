[![VulpeJS](https://github.com/activethread/vulpejs/raw/master/images/vulpejs.png)](http://activethread.github.io/vulpejs/)

# VulpeJS

Open-Source Full-Stack solution to Node.js applications with `Express.js`, `Pug`, `AngularJS` and `MongoDB`.

Works on Linux (stable) & MacOSx (stable) & Windows (stable).

[![NPM version](https://badge.fury.io/js/vulpejs.svg)](http://badge.fury.io/js/vulpejs) [![Gitter](https://badges.gitter.im/activethread/vulpejs.svg)](https://gitter.im/activethread/vulpejs?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge) [![Build Status](https://api.travis-ci.org/activethread/vulpejs.svg?branch=master)](https://travis-ci.org/activethread/vulpejs) [![Inline docs](http://inch-ci.org/github/activethread/vulpejs.svg?branch=master)](http://inch-ci.org/github/activethread/vulpejs) [![Dependency Status](https://david-dm.org/activethread/vulpejs.svg)](https://david-dm.org/activethread/vulpejs)

[![NPM](https://nodei.co/npm/vulpejs.png?downloads=true&downloadRank=true)](https://nodei.co/npm/vulpejs/)

## Examples

### VulpeJS Heroku Apptest Example.

- Download/Fork - <https://github.com/activethread/vulpejs-heroku-apptest>
- Access Apptest - <http://vulpejs-heroku-apptest.herokuapp.com/>

  - Username: admin@vulpe.org
  - Password: vulpejs

## Install

Add VulpeJS dependency in your `package.json`

```json
...
"vulpejs": "~0.1.37",
...
```

And run install:

```
npm install
```

Enjoy!

## Examples

### Creating a Simple CRUD

Add Model `models/city.js`

```javascript
  "use strict";

  /**
   * Create City Model
   * @return {Object} Model
   */
  module.exports = vulpejs.models.make({
    name: 'City',
    schema: {
      name: {
        type: String,
        required: true,
      },
      acronym: {
        type: String,
        required: true,
      },
      status: {
        type: String,
        required: true,
        'default': 'ACTIVE',
        enum: ['ACTIVE', 'INACTIVE'],
      },
      modified: {
        type: Date,
        'default': Date.now,
      },
      user: {
        type: vulpejs.mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    },
  });
```

Add Route `routes/city.js`

```javascript
"use strict";

/**
 * Create City Routes
 * @return {Object} Express Router
 */
module.exports = vulpejs.routes.make({
  name: 'city',
  plural: 'cities',
  save: {
    data: ['name', 'acronym'],
  },
  ui: {
    controller: {
      name: 'City',
      service: {
        plural: 'cities',
        predicate: 'name',
        focus: 'name',
        messages: {
          validate: {
            exists: 'City already exists.',
          },
        },
        model: {
          name: '',
          acronym: '',
          status: 'ACTIVE',
        },
      },
    },
    main: {
      title: 'City',
      inputs: [{
        type: 'text',
        name: 'name',
        label: 'Name',
        capitalize: 'first',
        required: true,
      }, {
        type: 'text',
        name: 'acronym',
        label: 'Acronym',
        case: 'upper',
        required: true,
      }, ],
    },
    select: {
      title: 'City List',
      filter: {
        search: {
          colspan: 2,
        },
        status: {
          colspan: 2,
          items: [{
            value: 'ACTIVE',
            label: 'Active',
          }, {
            value: 'INACTIVE',
            label: 'Inactive',
          }, ],
        },
      },
      items: [{
        name: 'name',
        label: 'Name',
        style: {
          width: '55%',
        },
      }, {
        name: 'acronym',
        label: 'Acronym',
        style: {
          width: '10%',
        },
      }, {
        name: 'status',
        style: {
          width: '10%',
        },
        css: {
          'class': 'text-center',
        },
        switch: [{
          when: 'ACTIVE',
          image: 'status-online.png',
          title: 'Active',
        }, {
          when: 'INACTIVE',
          image: 'status-offline.png',
          title: 'Inactive',
        }, ],
        label: 'Status',
      }, {
        label: 'Actions',
        style: {
          width: '10%',
        },
      }, ],
      actions: [],
    },
  },
});
```

Run it:

```bash
$ npm start
```

And access:

```
http://localhost:3000/city
```
