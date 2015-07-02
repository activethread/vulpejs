# VulpeJS - UI Module

## Table of contents

- [Properties](#properties)
  - [Controller properties](#controller-property)
    - [Service properties](#service-properties)
    - [Controller sample](#controller-sample)
  - [Modules properties](#modules-properties)
    - [Uploader module properties](#uploader-module-properties)
    - [Module sample](#module-sample)
  - [Main properties](#main-properties)
    - [Input types](#input-types)
    - [Generic input properties](#generic-input-properties)
    - [Specific input properties](#specific-input-properties)
      - [Text input properties](#text-input-properties)
      - [Select input properties](#select-input-properties)
      - [Password input properties](#password-input-properties)
      - [Textarea input properties](#textarea-input-properties)
      - [Checkbox input properties](#checkbox-input-properties)
    - [Output types](#output-types)
    - [Output properties](#output-properties)
    - [Main sample](#main-sample)
  - [Select properties](#select-properties)
    - [Filter properties](#filter-properties)
    - [Items properties](#items-properties)
    - [Actions properties](#actions-properties)
    - [Select sample](#select-sample)

## Properties
Property|Type|Example|Description
:------:|:--:|-------|-----------
controller|Object / String|`controler: {...}` or `controller: "Code"`|UI controler
modules|Object|`module: [{...}, {...}, {...}]`|UI modules dependency
main|Object|`main: {...}`|UI main section
select|Object|`select: {...}`|UI Select section
inputs|Object Array|`inputs: [{...}, {...}, {...}]`|UI inputs on simple (without main and select properties) section

### Controller properties

Property|Type|Example|Description
:------:|:--:|-------|-----------
name|String|`name: "Code"`|Controller name
service|Object|`service: {...}`|Controller service

#### Service properties
Property|Type|Example|Description
:------:|:--:|-------|-----------
name|String|`name: "code"`|Name of controller route
plural|String|`plural: "codes"`|Plural name of controller route, if not setted, receives the value of the property `name` + `'s'` (if name is "code", "codes" will be plural)
predicate|String|`predicate: "code"`|Predicate to search on select section
focus|String / Object / Function|`focus: "code"` or `focus: {create: "code", edit: "name"}` or `focus: function() {...}`|Controller focus on UI ready
model|Object|`model: {code: "", name: "", status: "ACTIVE"}`|Item structure on main section

#### Controller sample
```javascript
controller: {
  name: 'Code',
  service: {
    predicate: 'code',
    focus: 'code',
    messages: {
      validate: {
        exists: 'Code already exists.'
      }
    },
    model: {
      code: '',
      name: '',
      status: 'ACTIVE'
    }
  }
}
```
### Modules properties
Property|Type|Example|Description
:------:|:--:|-------|-----------
uploader|Object|`uploader: {flow: true, blueimp: true}`|Uploader module
editor|Boolean|`editor: true`|Text editor module
tree|Boolean|`tree: true`|Tree module
recaptcha|Boolean|`recaptcha: true`|Recaptcha module
rangeSlider|Boolean|`rangeSlider: true`|Range slider module
colorPicker|Boolean|`colorPicker: true`|Color picker module
datetimePicker|Boolean|`datetimePicker: true`|Datetime picker module
multiSelect|Boolean|`multiSelect: true`|Multi select module
dragDrop|Boolean|`dragDrop: true`|Drag and Drop module
switch|Boolean|`switch: true`|Toogle switch module
chart|Boolean|`chart: true`|Chart module

#### Uploader module properties
Property|Type|Example|Description
:------:|:--:|-------|-----------
flow|Object|`flow: {...}`|Flowjs uploader config
blueimp|Object|`blueimp: {...}`|Blueimp Jquery uploader config

#### Modules sample
```javascript
modules: {
  uploader: {
    flow: {
      emptyImageSize: '400x400'
    }
  }
}
```

### Main properties
Property|Type|Example|Description
:------:|:--:|-------|-----------
title|String|`title: "Code List"`|Title of main section
inputs|Object Array|`items: [{...}, {...}, {...}]`|Inputs of main section

#### Inputs

##### Input types

Type|Description
:--:|-----------
text|Text Input
date|Date Input
number|Number Input
password|Password Input
select|Select Input
textarea|Textarea Input
checkbox|Select Input
radio|Select Input
editor|Text editor Input
color-picker|Color picker Input
range-slider|Ranger slider Input
image-uploader|Image upload Input
file-uploader|Image upload Input
star-rating|Rating Input
typeahead|Typeahead Input

##### Generic input properties

Field|Type|Default|Mandatory|Example|Description
:---:|:--:|-------|---------|-------|-----------
name|String|none|true|`name: "code"`|Input name
model|String|none|false|`model: "otherCode"`|Input bind property (`vulpejs.item.otherCode`)
alias|String|none|false|`alias: "external"`|Input alias to bind property (`external.code`)
label|String|none|false|`label: "Code"`|Input label
css|Object|none|false|`css: {"class": "input-name"}`|Input CSS
style|Object / String|none|false|`style: {width: "50%"}` or `style: "width: 50%"`|Input CSS Style
required|Boolean / Expression|false|false|`required: true` or `requiredIf: "vulpejs.item.name === 'VulpeJS'"`|Input required
readonly|Boolean / Expression|false|false|`readonly: true` or `readonly: "vulpejs.item.readonly"`|Input readonly
show|Boolean / Expression|none|false|`show: true` or `show: "vulpejs.item.name !== 'VulpeJS'"`|Input is displayed if this condition is true
hide|Boolean / Expression|none|false|`hide: true` or `hide: "vulpejs.item.name !== 'VulpeJS'"`|Input is not displayed if this condition is true
on|Object|none|false|`on: {change: "vulpejs.input.change()",...}`|Add input events (change, blur, focus)

##### Specific input properties

###### Text input properties
Field|Type|Default|Mandatory|Example|Description
:---:|:--:|-------|---------|-------|-----------
only|Object|none|false|`only: {numeric: true}`|Determine input data type (numeric, alfa)
mask|String / Object|none|false|`mask: "date"` or `mask: {pattern: "99/99/9999"}`|Input mask,
capitalize|String|normal|false|`capitalize: "all"`|Input capitalize (`all`, `first`, `normal`)
case|String|normal|false|`"case": "upper"`|Input case (`upper`, `lower`, `normal`)

###### Select input properties
Field|Type|Default|Mandatory|Example|Description
:---:|:--:|-------|---------|-------|-----------
options|Object Array|none|true if items empty|`options: [{value: "", label: "Select any value"}]`|Dynamic select options
items|Object|none|true if options empty|`items: {name: "users", value: "_id", label: "name"}`|Dynamic select options

###### Password input properties
Field|Type|Default|Mandatory|Example|Description
:---:|:--:|-------|---------|-------|-----------
validate|Object|none|false|`validate: {expression: "'$value == vulpejs.item.password'", watch: "'vulpejs.item.password'", message: "Password do not match"}`|Validate password match (expression, watch, message)

###### Textarea input properties
Field|Type|Default|Mandatory|Example|Description
:---:|:--:|-------|---------|-------|-----------
rows|Number|2|false|`rows: 5`|Number of rows on Textarea

###### Checkbox input properties
Field|Type|Default|Mandatory|Example|Description
:---:|:--:|-------|---------|-------|-----------
toggle|Object|none|false|`{toggle: {on: "Yes", off: "No"}}`|Make checkbox switch toggle

###### Typeahead input properties
Field|Type|Default|Mandatory|Example|Description
:---:|:--:|-------|---------|-------|-----------
query|String|none|true|`query: "user.name for user in vulpejs.users"`|Auto complete from array list

##### Output types

Type|Description
:--:|-----------
show|Show property Output
timer|Timer Output

##### Output properties

Field|Type|Example|Description
:---:|:--:|-------|-----------
name|String|`name: "code"`|Input name
label|String|`label: "Code"`|Input label
show|String|`show: "vulpejs.item.name !== 'VulpeJS'"`|Input is displayed if this condition is true

#### Main sample
```javascript
main: {
  title: 'Code',
  inputs: [{
    type: 'text',
    name: 'code',
    label: 'Code',
    case: 'upper',
    required: true
  }, {
    type: 'text',
    name: 'name',
    label: 'Name',
    capitalize: 'first',
    required: true
  }]
}
```

### Select properties
Property|Type|Example|Description
:------:|:--:|-------|-----------
title|String|`title: "Code List"`|Title of select section
filter|Object / String|`filter: {search: {...}, status: {...}}` or `/views/includes/filter.jade`|Filter of select section
items|Object Array|`items: [{...}, {...}, {...}]`|Items of select section
actions|Object Array|`actions: [{...}, {...}, {...}]`|Actions of select section

#### Filter properties
Property|Type|Example|Description
:------:|:--:|-------|-----------
search|Object|`search: {colspan: 2}`|Search item by predicate
status|Object|`status: {colspan: 2, items: [{value: "ACTIVE", label: "Active"}, {value: "INACTIVE", label: "Inactive"}]}`|Status to filter item

#### Items properties
Property|Type|Example|Description
:------:|:--:|-------|-----------
name|String|`name: "code"`|Column item name
label|String|`label: "Code"`|Colum label to item
css|Object|`css: {"class": "text-center"}`|Column item CSS
style|Object / String|`style: {width: "10%"}` or `style: "width:10%"`|Column item style

Each item can be accessed in view simply as `{{item}}`.

#### Actions properties
Property|Type|Example|Description
:------:|:--:|-------|-----------
css|Object|`css: {"class": "text-center"}`|Column item CSS
show|Boolean / Expression|`show: true` or `show: "item.status !== 'INACTIVE'"`|Action is displayed if this condition is true
link|Object|`link: {href: "", click: "vulpejs.doSomething()", label: "Execute Something"}`|Action link to execute

#### Select sample
```javascript
select: {
  title: 'Code List',
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
    label: 'Code',
    style: {
      width: '25%'
    },
    name: 'code'
  }, {
    label: 'Name',
    style: {
      width: '40%'
    },
    name: 'name'
  }, {
    label: 'Status',
    name: 'status',
    style: {
      width: '10%'
    },
    css: {
      'class': 'text-center'
    },
    images: [{
      name: 'status-online.png',
      show: "vulpejs.equals(item, 'status', 'ACTIVE')",
      title: 'Active'
    }, {
      name: 'status-offline.png',
      show: "vulpejs.equals(item, 'status', 'INACTIVE')",
      title: 'Inactive'
    }]
  }, {
    label: 'Actions',
    style: {
      width: '25%'
    }
  }],
  actions: []
}
```
