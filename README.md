# Formgenerator Class

The `Formgenerator` class is a JavaScript utility for dynamically creating and managing forms in web applications. It simplifies the process of generating complex forms with various input types, validation, and submission capabilities.

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [Configuration](#configuration)
- [Methods](#methods)
- [Events](#events)
- [Examples](#examples)
- [Contributing](#contributing)
- [License](#license)

## Installation

The `Formgenerator` class can be used in your web application by importing it. You'll need jQuery as a dependency for AJAX and DOM functionality.

## Usage

To use the `Formgenerator` class, create an instance of it by passing in a configuration object and a prefix for your form. The configuration object defines the form's structure, fields, validation, and submission settings.

```js
import Formgenerator from "https://cdn.jsdelivr.net/gh/softwarepowerbeam/formgenerator@1.1.13/dist/Formgenerator.js";

const formParams = {
   // Configuration settings...
};

const form = new Formgenerator(formParams, 'form-prefix');
form.generate($('#form-container'));
```

## Configuration

The configuration object passed to the `Formgenerator` constructor should have the following properties:

- `target`: Specifies the submission target with `url` and `method`.
- `submitBtn`: Text for the submit button.
- `fieldsets`: An array of fieldset configurations, each containing a `label` and an array of `fields`.

For each field in the `fields` array, you can specify properties like `name`, `label`, `type`, `placeholder`, `required`, `validator`, `confirm`, and more.

## Methods

- `generate(parent)`: Generates the form and appends it to the specified parent element.
- `on(eventName, callback)`: Attaches event listeners to the form's event target.
- `getData()`: Retrieves form data as an object.
- `reset()`: Resets the form to its initial state.
- `setData(data)`: Populates the form with data.


## Events

The `Formgenerator` class triggers the following events:

- `beforeSubmit`: Fired before form submission. Use it for custom validation.
- `afterSubmit`: Fired after form submission. Provides response data if available.

## Examples

Here's an example configuration for creating a registration form:

```javascript
const formParams = {
   target: {
      url: "/account/register",
      method: "post",
   },
   submitBtn: "Register",
   fieldsets: [
      {
         label: "Register",
         fields: [
            {
               name: "email",
               label: "Email",
               type: "email",
               placeholder: "Email",
               required: true,
               validator: "/account/validate/email",
            },
            {
               name: "phone",
               label: "Phone",
               type: "tel",
               placeholder: "Phone number",
               required: true,
            },
            {
               name: "company",
               label: "Company",
               type: "text",
               placeholder: "Company",
            }
         ],
      },
   ],
};

const form = new Formgenerator(formParams, 'register-');
form.generate(document.getElementById('register-container'));
```