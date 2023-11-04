import * as FormField from './FormField.js';

export default class Formgenerator extends EventTarget {
    /**
     * 
     * @param {Object} config 
     * @param {string} prefix 
     */
    constructor(config, prefix) {
        super();
        this.config = config;
        this.prefix = `${prefix}-form`;
        this.fieldsets = [];
        /** @type {Object.<string,FormField.FormField>} */
        this.fields = {};
        /**  @type {Object.<string,FormField.FormField>} */
        this.fieldClasses = {};
        this.assignDefaultClasses();
        this.targetPath = config.targetPath || '';
    }
    /**
     * 
     * @param {JQuery} parent 
     */
    generate(parent) {
        for (const fieldsetParams of this.config.fieldsets) {
            const fieldSet = {
                label: fieldsetParams.label,
                className: fieldsetParams.className,
                fields: []
            };
            for (const fieldParams of fieldsetParams.fields) {
                this.fields[fieldParams.name] = new this.fieldClasses[fieldParams.type](this, fieldParams);
                fieldSet.fields.push(this.fields[fieldParams.name]);
            }
            this.fieldsets.push(fieldSet);
        }

        this.form = $('<form>', { id: this.prefix }).addClass(`powerbeamform ${this.prefix}`).appendTo(parent);
        this.form.on('submit', this._onsubmit.bind(this));

        for (const fieldset of this.fieldsets) {
            const fieldsetElement = $('<fieldset>', { html: `<legend>${fieldset.label}</legend>` }).addClass(`fieldset-${fieldset.label.replace(/ /g, '_')}`).appendTo(this.form);
            fieldsetElement.addClass(fieldset.className);
            for (const field of fieldset.fields) {
                field.generate().appendTo(fieldsetElement);
            }
        }

        if (this.config.submitBtn) {
            this.submitBtn = $('<button>', { type: 'submit', html: this.config.submitBtn }).addClass('btn btn-primary mt-2').appendTo(this.form);
        }

    }

    on(eventName, callback) {
        this.addEventListener(eventName, callback)
    }

    onFieldChange(field, callback) {
        this.addEventListener(`${field}_change`, callback);
    }

    async getData() {
        const formdata = new FormData(this.form[0]);
        const data = {};

        const fileReaders = [];

        for (const pair of formdata.entries()) {
            const [key, value] = pair;

            if (value instanceof File) {
                const reader = new FileReader();
                fileReaders.push(
                    new Promise((resolve) => {
                        reader.onload = function () {
                            resolve({ key, value: reader.result });
                        };
                    })
                );
                reader.readAsDataURL(value);
            } else {
                if (data[key] === undefined) {
                    data[key] = value;
                } else {
                    if (!Array.isArray(data[key])) {
                        data[key] = [data[key]];
                    }
                    data[key].push(value);
                }
            }
        }
        const fileResults = await Promise.all(fileReaders);

        for (const { key, value } of fileResults) {
            if (data[key] === undefined) {
                data[key] = value;
            } else {
                if (!Array.isArray(data[key])) {
                    data[key] = [data[key]];
                }
                data[key].push(value);
            }
        }

        return data;
    }

    async countValues() {
        const data = await this.getData();
        let fill = 0;
        for (const name of Object.keys(data)) {
            const value = data[name];
            if (value.length > 0 || this.fields[name].params.type === 'file' || this.fields[name].params.type === 'checkbox') {
                fill++;
            }
        }
        return fill;
    }

    reset() {
        this.form[0].reset();
    }

    setData(data) {
        for (const name of Object.keys(data)) {
            if (!this.fields[name]) {
                console.warn('There is not ' + name + ' in fields', Object.keys(this.fields));
                continue;
            }
            this.fields[name].setValue(data[name]);
        }
        for (const name of Object.keys(this.fields)) {
            if (!this.fields[name]) {
                continue;
            }
            this.fields[name].isEnabled();
        }
    }

    async _onsubmit(e) {
        e.preventDefault();
        const data = await this.getData();

        const beforeSubmitEvent = new CustomEvent('beforeSubmit', { detail: data, cancelable: true });
        const continueSubmit = this.dispatchEvent(beforeSubmitEvent);
        if (!continueSubmit) return false; //if any previous validation fails wont submit

        const enabled = this.form.find(":input:enabled:not([type=button])");
        enabled.prop("disabled", true);

        const detail = { data }

        if (this.config.target) {

            detail.response = await this.fetchRequest(this.config.target.method, this.targetPath + this.config.target.url, data)
        }
        const afterSubmitEvent = new CustomEvent('afterSubmit', { detail });
        afterSubmitEvent.response = detail.response;
        afterSubmitEvent.data = detail.data;
        this.dispatchEvent(afterSubmitEvent);

        this.form.find(":input:not([type=button])").prop("disabled", true);
        enabled.prop("disabled", false);

        return false;
    }

    /**
     * 
     * @param {string} method 
     * @param {string} url 
     * @param {Object} data 
     * @returns 
     */
    async fetchRequest(method, url, data) {
        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });


            if (!response.ok) { return { success: false, status: response.status } }

            const responseData = await response.json();
            return responseData;
        } catch (error) {
            console.error(error);
            return { success: false, error }
        }
    }
    /**
     * 
     * @param {string} inputType 
     * @param {FormField.FormField} FieldClass 
     */
    assignFieldType(inputType, FieldClass) {
        this.fieldClasses[inputType] = FieldClass;
    }

    assignDefaultClasses() {
        const inputTypes = [
            "text",
            "password",
            "email",
            "url",
            "tel",
            "date",
            "datetime-local",
            "month",
            "week",
            "time",
            "color",
            "range",
            "search"
        ];

        for (const inputType of inputTypes) {
            this.assignFieldType(inputType, FormField.InputField);
        }

        this.assignFieldType('checkbox', FormField.CheckboxField);
        this.assignFieldType('radio', FormField.RadioField);
        this.assignFieldType('select', FormField.SelectField);
        this.assignFieldType('textarea', FormField.TextareaField);
        this.assignFieldType('hidden', FormField.HiddenField);
        this.assignFieldType('label', FormField.LabelField);
        this.assignFieldType('file', FormField.FileField);
        this.assignFieldType('number', FormField.NumberField);

    }
}




