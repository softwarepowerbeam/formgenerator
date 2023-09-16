
export class FormField {
    /**
     * 
     * @param {Formgenerator} formgenerator 
     * @param {Object} fieldParams 
     */
    constructor(formgenerator, fieldParams) {
        this.form = formgenerator;
        this.params = fieldParams;
        this.prefix = this.form.prefix;
        this.eventTarget = new EventTarget();
    }
    generate() {
        this.div = $('<div>', { id: `${this.prefix}-div-${this.params.name}` }).addClass(`powerbeamform-div ${this.prefix}-div`);
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

        if (this.params.units) {
            const subdiv = $('<div>').addClass('powerbeamform-input-units-group');
            element.after(subdiv);
            subdiv.append(element);
            element.attr("data-units", this.params.units);
            element.addClass('powerbeamform-units');
            const span = $('<span>').addClass('powerbeamform-units-span').html(this.params.units);
            subdiv.append(span);
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

    on(eventName, callback) {
        this.eventTarget.addEventListener(eventName, callback)
    }

    _onchange() {
        const changeEvent = new Event('change');
        changeEvent.data = { field: this.params.name, value: this.getValue() };
        this.eventTarget.dispatchEvent(changeEvent);
        this.form.eventTarget.dispatchEvent(changeEvent);

        const fieldChangeEvent = new Event(`${this.params.name}_change`);
        fieldChangeEvent.data = { field: this.params.name, value: this.getValue() };
        this.form.eventTarget.dispatchEvent(fieldChangeEvent);
    }

}

export class InputField extends FormField {
    constructor(formgenerator, fieldParams) {
        super(formgenerator, fieldParams);
    }
    generate() {
        super.generate();
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
        this.input.on('change', this._onchange.bind(this));
        return this;
    }

    setValue(value) {
        this.input.val(value);
    }

    getValue() {
        return this.input.val();
    }


}

export class CheckboxField extends FormField {
    constructor(formgenerator, fieldParams) {
        super(formgenerator, fieldParams);
    }

    generate() {
        super.generate();
        this.div.addClass('form-check');
        this.input = $('<input>', {
            id: `${this.prefix}-input-${this.params.name}`,
            type: 'checkbox',
            value: '1'
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
        this.input.on('change', this._onchange.bind(this));
        return this;
    }

    setValue(value) {
        if (value) {
            this.input.prop('checked', true);
        } else {
            this.input.prop('checked', false);
        }
    }

    getValue() {
        return (this.input.is(':checked')) ? '1' : undefined;
    }
}

export class RadioField extends FormField {
    constructor(formgenerator, fieldParams) {
        super(formgenerator, fieldParams);
    }

    generate() {
        super.generate();
        this.fieldset = $('<fieldset>', { html: `<legend>${this.params.label}</legend>` }).appendTo(this.div);
        this.options = [];
        this.input = [];
        this.fillOptions();
        return this;
    }
    fillOptions() {
        for (const option of this.options) {
            option.div.remove();
        }
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
            option.input.on('change', this._onchange.bind(this));
            option.label = $('<label>', { for: `${this.prefix}-input-${this.params.name}-${optionParams.value}`, html: optionParams.label })
                .addClass(`powerbeamform-label  ${this.prefix}-label form-check-label`).appendTo(option.div);

            this.options.push(option);
            this.input.push(option.input);
        }
    }
    setValue(value) {
        for (const input of this.input) {
            if (input.attr('value') === value) {
                input.prop('checked', true);
            }
        }
    }

    getValue() {
        for (const input of this.input) {
            if (input.is(':checked')) {
                return input.attr('value');
            }
        }
    }
}

export class SelectField extends FormField {
    constructor(formgenerator, fieldParams) {
        super(formgenerator, fieldParams);
    }

    generate() {
        super.generate();
        this.label = $('<label>', { for: `${this.prefix}-input-${this.params.name}`, html: this.params.label })
        .addClass(`powerbeamform-label  ${this.prefix}-label form-label`).appendTo(this.div);
        this.input = $('<select>', { required: this.params.required, name: this.params.name, id: `${this.prefix}-input-${this.params.name}` }).addClass('form-select').appendTo(this.div);
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
        this.input.on('change', this._onchange.bind(this));
        return this;
    }

    setValue(value) {
        this.input.val(value);
    }

    getValue() {
        return this.input.val();
    }

}

export class TextareaField extends FormField {
    constructor(formgenerator, fieldParams) {
        super(formgenerator, fieldParams);
    }

    generate() {
        super.generate();
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
        this.input.on('change', this._onchange.bind(this));
        return this;
    }

    setValue(value) {
        this.input.val(value);
    }

    getValue() {
        return this.input.val();
    }
}

export class HiddenField extends FormField {
    constructor(formgenerator, fieldParams) {
        super(formgenerator, fieldParams);
    }

    appendTo(parent) {
        this.input.appendTo(parent);
        return this;
    }

    generate() {
        this.input = $('<input>', {
            id: `${this.prefix}-input-${this.params.name}`,
            type: 'hidden'
        }).addClass(`powerbeamform-input ${this.prefix}-input form-control`).appendTo(this.div);
        this.assignStandardAttributes(this.input);
        this.input.on('change', this._onchange.bind(this));
        return this;
    }
    setValue(value) {
        this.input.val(value);
    }

    getValue() {
        return this.input.val();
    }
}