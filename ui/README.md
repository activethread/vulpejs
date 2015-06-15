# VulpeJS - UI Module

## Inputs

### Input types

Type|Description
:--:|-----------
text|Text Input
date|Date Input
number|Number Input
password|Password Input
select|Select Input
editor|Text editor Input
range-slider|Ranger slider Input
image-uploader|Image upload Input
file-uploader|Image upload Input
star-rating|Rating Input

### Generic input fields

Field|Type|Default|Mandatory|Example|Description
:---:|:--:|-------|---------|-------|-----------
name|String|none|true|`name: "code"`|Input name
label|String|none|false|`label: "Code"`|Input label
style|Object|none|false|`style: {"class": "input-name"}`|Input CSS
required|Boolean / Expression|false|false|`required: true` or `requiredIf: "vulpejs.item.name === 'VulpeJS'"`|Input required
readonly|Boolean / Expression|false|false|`readonly: true` or `readonly: "vulpejs.item.readonly"`|Input readonly
show|Boolean / Expression|none|false|`show: true` or `show: "vulpejs.item.name !== 'VulpeJS'"`|Input is displayed if this condition is true
hide|Boolean / Expression|none|false|`hide: true` or `hide: "vulpejs.item.name !== 'VulpeJS'"`|Input is not displayed if this condition is true
on|Object|none|false|`on: {change: "vulpejs.input.change()",...}`|Add input events (change, blur, focus)

### Specific input fields

#### Text input specific fields
Field|Type|Default|Mandatory|Example|Description
:---:|:--:|-------|---------|-------|-----------
only|Object|none|false|`only: {numeric: true}`|Determine input data type (numeric, alfa, alfanumeric)
typeahead|Object|none|false|`typeahead: {query: "user.name for user in vulpejs.users"}`|Auto complete from array list
mask|String / Object|none|false|`mask: "date"` or `mask: {pattern: "99/99/9999"}`|Input mask,
capitalize|String|normal|false|`capitalize: "all"`|Input capitalize (`all`, `first`, `normal`)
case|String|normal|false|`"case": "upper"`|Input case (`upper`, `lower`, `normal`)
minicolors|Boolean|false|false|`minicolors: true`|Enable input color picker

#### Select input specific fields
Field|Type|Default|Mandatory|Example|Description
:---:|:--:|-------|---------|-------|-----------
options|Object Array|none|true if items empty|`options: [{value: "", label: "Select any value"}]`|Dynamic select options
items|Object|none|true if options empty|`items: {name: "users", value: "_id", label: "name"}`|Dynamic select options

#### Password input specific fields
Field|Type|Default|Mandatory|Example|Description
:---:|:--:|-------|---------|-------|-----------
validate|Object|none|false|`validate: {expression: "'$value == vulpejs.item.password'", watch: "'vulpejs.item.password'", message: "Password do not match"}`|Validate password match (expression, watch, message)

#### Textarea input specific fields
Field|Type|Default|Mandatory|Example|Description
:---:|:--:|-------|---------|-------|-----------
rows|Number|2|false|`rows: 5`|Number of rows on Textarea

### Output types

Type|Description
:--:|-----------
show|Show property Output
timer|Timer Output

### Output fields

Field|Type|Example|Description
:---:|:--:|-------|-----------
name|String|`name: "code"`|Input name
label|String|`label: "Code"`|Input label
showIf|String|`showIf: "vulpejs.item.name !== 'VulpeJS'"`|Input is displayed if this condition is true
