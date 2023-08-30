
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
        for (const fieldsetParams of this.config.fieldsets) {
            const fieldSet = {
                label: fieldsetParams.label,
                fields: []
            };
            for (const fieldParams of fieldsetParams.fields) {
                this.fields[fieldParams.name] = new PowerbeamField(this, fieldParams);
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

    getData() {
        const formdata = new FormData(this.form[0]);
        const data = {};
        for (const pair of formdata.entries()) {
            data[pair[0]] = pair[1];
        }
        return data;
    }

    reset() {
        this.form[0].reset();
    }

    setData(data) {
        for (const name of Object.keys(data)) {
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

}

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


class PowerbeamField {
    /**
     * 
     * @param {Formgenerator} formgenerator 
     * @param {Object} fieldParams 
     */
    constructor(formgenerator, fieldParams) {
        this.form = formgenerator;
        this.params = fieldParams;
        this.prefix = this.form.prefix;
    }
    generate() {

        this.div = $('<div>', { id: `${this.prefix}-div-${this.params.name}` }).addClass(`powerbeamform-div ${this.prefix}-div`);

        if (inputTypes.includes(this.params.type)) return this.inputGenerator();

        if (this.params.type === 'checkbox') return this.checkBoxGenerator();

        if (this.params.type === 'radio') return this.radioGenerator();

        if (this.params.type === 'select') return this.selectGenerator();

        if (this.params.type === 'textarea') return this.textAreaGenerator();

    }

    appendTo(parent) {
        this.div.appendTo(parent);
        return this;
    }

    assignStandardAttributes(element) {
        element.attr({
            name: this.params.name,
            required: this.params.required,
            placeholder: this.params.placeholder,
            title: this.params.title,
            step: this.params.step,
            min: this.params.min,
            max: this.params.max,
            size: this.params.min,
            maxlength: this.params.maxlength,
            minlength: this.params.minlength,
            pattern: (this.params.pattern) ? (new RegExp(this.params.pattern, 'g')) : undefined,
        })

        if(this.params.units){
            element.attr("data-units",this.params.units);
            element.addClass('powerbeamform-units');
            const span = $('<span>').addClass('powerbeamform-units-span').html(this.params.units);
            this.div.append(span);
        }

        if (this.params.required) {
            element.addClass('powerbeamform-required');
        }

        if (this.params.validator) {
            element.addClass('powerbeamform-validate');
            element.on('change', this.validate.bind(this));
        }

        if (this.params.confirm) {
            element.addClass('powerbeamform-validate');
            element.on('change focusout', this.confirm.bind(this));
        }

        if (this.params.attributes) {
            element.attr(this.params.attributes);
        }
    }

    async validate() {
        const value = this.input.val();

        this.label.addClass('powerbeamform-label-validating');
        this.input.addClass('powerbeamform-validating');

        const response = await this.form.ajaxRequest('post', this.form.targetPath + this.params.validator, { value });

        this.label.removeClass('powerbeamform-label-validating');
        this.input.removeClass('powerbeamform-validating');

        if (response.valid) {
            this.label.addClass('powerbeamform-label-valid');
            this.input.addClass('powerbeamform-valid');
            this.input[0].setCustomValidity("");
        } else {
            this.label.removeClass('powerbeamform-label-valid');
            this.input.removeClass('powerbeamform-valid');
            this.input[0].setCustomValidity("Already in use");
        }
        this.input[0].reportValidity();
    }


    confirm() {
        const value = this.input.val();

        const data = this.form.getData();

        if (value === data[this.params.confirm]) {
            this.label.addClass('powerbeamform-label-valid');
            this.input.addClass('powerbeamform-valid');
            this.input[0].setCustomValidity("");
        } else {
            this.label.removeClass('powerbeamform-label-valid');
            this.input.removeClass('powerbeamform-valid');
            this.input[0].setCustomValidity("Mismatch");
        }
        setTimeout(() => {
            this.input[0].reportValidity();
        }, 100);
    }

    setValue(value) {
        this.input.val(value);
    }

    inputGenerator() {
        this.label = $('<label>', { for: `${this.prefix}-input-${this.params.name}`, html: this.params.label })
            .addClass(`powerbeamform-label  ${this.prefix}-label form-label`).appendTo(this.div);
        if (this.params.required) {
            this.label.addClass('powerbeamform-label-required');
        }
        this.input = $('<input>', {
            id: `${this.prefix}-input-${this.params.name}`,
            type: this.params.type
        }).addClass(`powerbeamform-input ${this.prefix}-input form-control`).appendTo(this.div);
        this.assignStandardAttributes(this.input);
        return this;
    }

    checkBoxGenerator() {
        this.div.addClass('form-check');
        this.input = $('<input>', {
            id: `${this.prefix}-input-${this.params.name}`,
            type: 'checkbox',
        }).addClass(`powerbeamform-input  ${this.prefix}-input form-check-input`).appendTo(this.div);

        this.assignStandardAttributes(this.input);
        if (this.params.attributes) {
            this.input.attr(this.params.attributes);
        }

        this.label = $('<label>', { for: `${this.prefix}-input-${this.params.name}`, html: this.params.label })
            .addClass(`powerbeamform-label  ${this.prefix}-label form-check-label`).appendTo(this.div);
        if (this.params.required) {
            this.label.addClass('powerbeamform-label-required');
        }
        return this;
    }

    radioGenerator() {
        this.fieldset = $('<fieldset>', { html: `<legend>${this.params.label}</legend>` }).appendTo(this.div);
        this.options = [];
        this.input = [];
        for (const optionParams of this.params.options) {

            const option = { value: optionParams.value };

            option.div = $('<div>', { id: `${this.prefix}-div-${this.params.name}-${optionParams.value}` }).addClass(`form-check`).appendTo(this.fieldset);
            option.input = $('<input>', {
                id: `${this.prefix}-input-${this.params.name}-${optionParams.value}`,
                name: this.params.name,
                value: optionParams.value,
                type: 'radio',
                title: optionParams.title,
                required: this.params.required
            }).addClass(`powerbeamform-input  ${this.prefix}-input form-check-input`).appendTo(option.div);

            option.label = $('<label>', { for: `${this.prefix}-input-${this.params.name}-${optionParams.value}`, html: optionParams.label })
                .addClass(`powerbeamform-label  ${this.prefix}-label form-check-label`).appendTo(option.div);

            this.options.push(option);
            this.input.push(option.input);
        }
        return this;
    }

    selectGenerator() {
        this.input = $('<select>', { required: this.params.required }).addClass('form-select').appendTo(this.div);
        this.options = [];
        for (const optionParams of this.params.options) {
            const option = $('<option>', {
                id: `${this.prefix}-option-${this.params.name}-${optionParams.value}`,
                name: this.params.name,
                value: optionParams.value,
                html: optionParams.label,
            }).addClass(`powerbeamform-input  ${this.prefix}-input form-check-input`).appendTo(this.input);
            this.options.push(option);
        }
        if (this.params.attributes) {
            this.input.attr(this.params.attributes);
        }
        return this;
    }


    textAreaGenerator() {
        this.label = $('<label>', { for: `${this.prefix}-input-${this.params.name}`, html: this.params.label })
            .addClass(`powerbeamform-label  ${this.prefix}-label form-label`).appendTo(this.div);
        if (this.params.required) {
            this.label.addClass('powerbeamform-label-required');
        }
        if (this.params.validate) {
            this.label.addClass('powerbeamform-label-validate');
        }
        this.input = $('<textarea>', {
            id: `${this.prefix}-input-${this.params.name}`,
        }).addClass(`powerbeamform-input ${this.prefix}-input form-control`).appendTo(this.div);
        this.assignStandardAttributes(this.input);
        if (this.params.attributes) {
            this.input.attr(this.params.attributes);
        }
        return this;
    }


}