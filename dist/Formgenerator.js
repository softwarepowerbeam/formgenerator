import * as FormField from './FormField.js';

export default class Formgenerator {
    /**
     * 
     * @param {Object} config 
     * @param {string} prefix 
     */
    constructor(config, prefix) {
        this.config = config;
        this.prefix = `${prefix}-form`;
        this.fieldsets = [];
        this.fields = {};
        this.eventTarget = new EventTarget();
        this.validators = [];
        this.fieldClasses = {};

        for (const fieldsetParams of this.config.fieldsets) {
            const fieldSet = {
                label: fieldsetParams.label,
                fields: []
            };
            for (const fieldParams of fieldsetParams.fields) {
                this.fields[fieldParams.name] = new this.fieldClasses[fieldParams.type](this, fieldParams);
                fieldSet.fields.push(this.fields[fieldParams.name]);
            }
            this.fieldsets.push(fieldSet);
        }
        this.targetPath = config.targetPath || '';
    }
    /**
     * 
     * @param {JQuery} parent 
     */
    generate(parent) {
        this.form = $('<form>', { id: this.prefix }).addClass(`powerbeamform ${this.prefix}`).appendTo(parent);
        this.form.on('submit', this._onsubmit.bind(this));

        for (const fieldset of this.fieldsets) {
            const fieldsetElement = $('<fieldset>', { html: `<legend>${fieldset.label}</legend>` }).appendTo(this.form);
            for (const field of fieldset.fields) {
                field.generate().appendTo(fieldsetElement);
            }
        }

        if (this.config.submitBtn) {
            this.submitBtn = $('<button>', { type: 'submit', html: this.config.submitBtn }).addClass('btn btn-primary mt-2').appendTo(this.form);
        }

    }

    on(eventName, callback) {
        this.eventTarget.addEventListener(eventName, callback)
    }

    onFieldChange(field, callback) {
        this.eventTarget.addEventListener(`${field}_change`, callback);
    }


    getData() {
        const formdata = new FormData(this.form[0]);
        const data = {};
        for (const pair of formdata.entries()) {
            data[pair[0]] = pair[1];
        }
        return data;
    }

    countValues() {
        const data = this.getData();
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
                console.error('There is not ' + name + ' in fields', Object.keys(this.fields));
                continue;
            }
            this.fields[name].setValue(data[name]);
        }
    }

    async _onsubmit(e) {
        e.preventDefault();
        const data = this.getData();

        const beforeSubmitEvent = new Event('beforeSubmit');
        beforeSubmitEvent.data = data;

        const continueSubmit = this.eventTarget.dispatchEvent(beforeSubmitEvent);
        if (!continueSubmit) return false; //if any previous validation fails wont submit

        const afterSubmitEvent = new Event('afterSubmit');
        afterSubmitEvent.data = data;


        const enabled = this.form.find(":input:enabled:not([type=button])");
        enabled.prop("disabled", true);

        if (this.config.target) {
            afterSubmitEvent.response = await this.ajaxRequest(this.config.target.method, this.targetPath + this.config.target.url, data)
        }

        this.form.find(":input:not([type=button])").prop("disabled", true);

        this.eventTarget.dispatchEvent(afterSubmitEvent);

        enabled.prop("disabled", false);

        return false;
    }

    _onchange(e) {
        const beforeSubmitEvent = new Event('beforeSubmit');
        beforeSubmitEvent.data = data;
    }

    /**
     * 
     * @param {string} method 
     * @param {string} url 
     * @param {Object} data 
     * @returns 
     */
    async ajaxRequest(method, url, data) {
        const response = await new Promise(resolve => {
            $.ajax(url, {
                data: JSON.stringify(data),
                method,
                dataType: "json",
                contentType: "application/json",
            }).done((data, textStatus) => {
                resolve({ data, textStatus });
            }).fail((jqXHR, textStatus, errorThrown) => {
                resolve({ textStatus, errorThrown });
            });
        });
        if (response.errorThrown) {
            console.error(response.errorThrown);
            return { success: false };
        }
        return response.data;
    }

    assignFieldType(inputType, FieldClass) {
        this.fieldClasses[inputType] = FieldClass;
    }

    assignDefaultClasses() {
        const inputTypes = [
            "text",
            "password",
            "email",
            "number",
            "url",
            "tel",
            "date",
            "datetime-local",
            "month",
            "week",
            "time",
            "color",
            "file",
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
    }
}




