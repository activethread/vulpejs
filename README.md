# Vulpe JS

Open-Source Full-Stack solution to Node.js applications with `Express.js`, `Jade`, `Angular.JS` and `MongoDB`.

## Install
Add VulpeJS dependency in your `package.json`:

    ...
    "vulpejs": "~0.0.4",
    ...

And run install:

    npm install

Enjoy!

## Examples

### Creating a Simple CRUD
* Add Model

`models/city.js`

    "use strict";

    /**
     * Create City Model
     * @returns {Object} Model
     */
    module.exports = vulpejs.models.make({
      name: 'City',
      schema: {
        name: {
          type: String,
          required: true
        },
        acronym: {
          type: String,
          required: true
        },
        status: {
          type: String,
          required: true,
          'default': 'ACTIVE',
          enum: ['ACTIVE', 'INACTIVE']
        },
        modified: {
          type: Date,
          'default': Date.now
        },
        user: {
          type: vulpejs.mongoose.Schema.Types.ObjectId,
          ref: 'User'
        }
      }
    });

* Add Route

`routes/city.js`

    "use strict";

    /**
     * Create City Routes
     * @returns {Object} Express Router
     */
    module.exports = vulpejs.routes.make({
      name: 'city',
      plural: 'cities',
      save: {
        data: ['name', 'acronym']
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
                exists: 'City already exists.'
              }
            },
            model: {
              name: '',
              acronym: '',
              status: 'ACTIVE'
            }
          }
        },
        minicolors: true,
        main: {
          title: 'City',
          inputs: [{
            type: 'text',
            name: 'name',
            label: 'Name',
            capitalizeFirst: true,
            required: true
          }, {
            type: 'text',
            name: 'acronym',
            label: 'Acronym',
            upperCase: true,
            required: true
          }]
        },
        select: {
          title: 'City List',
          filter: {
            search: {
              colspan: 2
            },
            status: {
              colspan: 2,
              items: [{
                value: 'ACTIVE',
                label: 'Active'
              }, {
                value: 'INACTIVE',
                label: 'Inactive'
              }]
            }
          },
          items: [{
            name: 'name',
            label: 'Name',
            width: '55%'
          }, {
            name: 'acronym',
            label: 'Acronym',
            width: '10%'
          }, {
            name: 'status',
            className: 'text-center',
            images: [{
              name: 'status-online.png',
              showIf: "vulpejs.equals(selectItem, 'status', 'ACTIVE')",
              title: 'Active'
            }, {
              name: 'status-offline.png',
              showIf: "vulpejs.equals(selectItem, 'status', 'INACTIVE')",
              title: 'Inactive'
            }],
            label: 'Status',
            width: '10%'
          }, {
            label: 'Actions',
            width: '25%'
          }],
          actions: []
        }
      }
    });

* Run it

`npm start`
