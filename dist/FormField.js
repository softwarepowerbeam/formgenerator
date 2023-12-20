/**
 * @typedef Formgenerator
 * @type {import('./Formgenerator.js').default}
 */
export class FormField extends EventTarget {
    /**
     * 
     * @param {Formgenerator} formgenerator 
     * @param {Object} fieldParams 
     */
    constructor(formgenerator, fieldParams) {
        super();
        this.form = formgenerator;
        this.params = fieldParams;
        this.prefix = this.form.prefix;
        this.required = this.params.required;
        this.value = fieldParams.value;
        if (this.depends) {
            this.form.onFieldChange(this.depends.field, this.isEnabled.bind(this));
        }
    }

    get depends() {
        if (!this.params.depends) return false;
        const regex = /^([^()]+)(?:\(([^)]+)\))?$/;
        const match = this.params.depends.match(regex);
        if (match) {
            const field = match[1];
            const value = match[2];

            return {
                field,
                value,
            };
        } else {
            return null;
        }
    }

    isEnabled() {
        if (!this.depends) return true;
        const value = editor.instanceForm.fields[this.depends.field].getValue();
        if (!value) {
            if (this.div) this.div.hide();
            return false;
        }
        if (!isNaN(value) && !Number(value)) { // if is zero
            if (this.div) this.div.hide();
            return false;
        }
        if (this.depends.value && this.depends.value !== value) {
            if (this.div) this.div.hide();
            return false;
        }
        if (this.div) this.div.show();
        return true;
    }

    generate() {
        this.div = $('<div>', { id: `${this.prefix}-div-${this.params.name}` }).addClass(`powerbeamform-div ${this.prefix}-div ${this.params.type}-div`);
        this.isEnabled();
    }

    appendTo(parent) {
        this.div.appendTo(parent);
        return this;
    }

    assignStandardAttributes(element) {
        element.attr({
            name: this.params.name,
            placeholder: this.params.placeholder,
            title: this.params.title,
            size: this.params.size,
            maxlength: this.params.maxlength,
            minlength: this.params.minlength,
            pattern: (this.params.pattern) ? this.params.pattern : undefined,
        })

        element.addClass(this.params.className);

        if (this.form.config.forceRequired) {
            element.attr('required', this.params.required);
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
        if (!this.changed) return;
        const value = this.input.val();

        this.label.addClass('powerbeamform-label-validating');
        this.input.addClass('powerbeamform-validating');

        const response = await this.form.fetchRequest('post', this.form.targetPath + this.params.validator, { value });

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
        this.changed = false;
        this.input[0].reportValidity();

    }
    async confirm() {
        if (!this.changed) return;
        const value = this.input.val();
        this.changed = false;
        const data = await this.form.getData();

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
        this.addEventListener(eventName, callback)
    }

    setValue(value) {
        this.value = value;
        this.userSet = false;
    }

    _onchange(e = {}) {
        const autoSet = !!e.autoSet;
        this.userSet = !autoSet;
        this.changed = true;
        const lastValue = this.value;
        const value = this.getValue();

        this.value = value;
        if (value === lastValue && !autoSet) { return; }

        const changeEvent = new CustomEvent('change', { detail: { field: this.params.name, value, lastValue, autoSet } });
        changeEvent.data = { field: this.params.name, value, lastValue };
        this.dispatchEvent(changeEvent);
        this.form.dispatchEvent(changeEvent);

        const fieldChangeEvent = new CustomEvent(`${this.params.name}_change`, { detail: { field: this.params.name, value, lastValue, autoSet } });
        fieldChangeEvent.data = { field: this.params.name, value, lastValue };
        this.form.dispatchEvent(fieldChangeEvent);

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

        if (this.params.values) {
            this.input.val(this.params.values);
        }

        this.assignStandardAttributes(this.input);
        this.input.on('change', this._onchange.bind(this));
        return this;
    }

    setValue(value) {
        super.setValue(value);
        this.input.val(value);
    }

    getValue() {
        return this.input.val();
    }
}

export class NumberSubField extends EventTarget {
    constructor(fieldParams) {
        super();
        this.params = fieldParams;
        this.value = fieldParams.value || '';
        this.availableUnits = [];
        this.unitOptions = {};
    }
    generate(div) {

        this.numberInput = $('<input>', {
            id: `${this.prefix}-input-${this.params.name}`,
            type: 'number',
            step: this.params.step,
            min: this.params.min,
            max: this.params.max,
        }).addClass(`powerbeamform-input ${this.prefix}-input form-control`);
        this.numberInput.on('focus', () => {
            this.numberInput.select();
        });

        this.numberInput.attr("data-units", this.params.units);
        this.numberInput.addClass('powerbeamform-units');
        this.numberInput.on('change', this.onvaluechange.bind(this));
        this.numberInput.on('keydown', this.onkeydown.bind(this));

        if (this.params.units) {
            const subdiv = $('<div>').addClass('powerbeamform-input-units-group').appendTo(div);
            this.numberInput.appendTo(subdiv);
            this.availableUnits = this.params.units.split(',');
            if (this.availableUnits.length > 1) {
                this.unitOptions = {};
                this.unitSelector = $('<select>').attr('tabindex', "-1").addClass('powerbeamform-units-selector').appendTo(subdiv);
                for (const unit of this.availableUnits) {
                    this.unitOptions[unit] = $('<option>', { html: unit, value: unit }).appendTo(this.unitSelector);
                }
                this.unitSelector.on('change', this.onunitchange.bind(this));
            } else {
                const span = $('<span>').addClass('powerbeamform-units-span').html(this.params.units);
                subdiv.append(span);
            }
        } else {
            this.numberInput.appendTo(div);
        }
    }

    onunitchange() {
        const oldUnit = this.lastUnits;
        const newUnit = this.units;
        const numVal = this.numVal;
        this.dispatchEvent(new CustomEvent('unitchange', { detail: { oldUnit, newUnit, numVal } }));
        this.onvaluechange();
    }

    findUnit(value, caseInsensitive) {
        const prompt = (caseInsensitive) ? value.toLowerCase() : value;
        for (const unit of Object.keys(this.unitOptions)) {
            if (caseInsensitive) {
                if (unit.toLocaleLowerCase().startsWith(prompt)) return unit;
            } else {
                if (unit.startsWith(prompt)) return unit;
            }
        }
        return false;
    }

    onkeydown(e) {
        if (!isNaN(e.key) || e.key === '.' || e.key === ',') return;
        let unit = this.findUnit(e.key);
        if (!unit) {
            unit = this.findUnit(e.key, true);
        }
        if (unit) {
            this.units = unit;
            e.preventDefault();
            e.stopPropagation();
            this.onvaluechange();
        }
        if (e.key == 'ArrowUp' || e.key == 'ArrowDown') {
            this.onarrow(e);
        }
    }
    onarrow(e) {
        e.preventDefault();
        e.stopPropagation();
        const step = this.params.step || 1;
        let target;
        if (e.shiftKey) {
            if (e.key == 'ArrowUp') {
                if (step < 1) {
                    target = Number(this.numVal) + 10;
                } else {
                    target = Number(this.numVal) + 10 * step;
                }
            } else {
                if (step < 1) {
                    target = Number(this.numVal) - 10;
                } else {
                    target = Number(this.numVal) - 10 * step;
                }
            }
        } else {
            if (e.key == 'ArrowUp') {
                if (step < 1) {
                    if (e.ctrlKey || e.metaKey) {
                        target = Number(this.numVal) + step;
                    } else {
                        target = Number(this.numVal) + 1
                    }
                } else {
                    target = Number(this.numVal) + step;
                }

            } else {
                if (step < 1) {
                    if (e.ctrlKey || e.metaKey) {
                        target = Number(this.numVal) - step;
                    } else {
                        target = Number(this.numVal) - 1
                    }
                } else {
                    target = Number(this.numVal) - step;
                }
            }
        }

        if (!isNaN(this.params.min) && target < this.params.min && this.params.min !== null) {
            target = this.params.min;
        }
        if (!isNaN(this.params.max) && target > this.params.max && this.params.max !== null) {
            target = this.params.max;
        }

        if (step && step.toString().split('.').length > 1) {
            target = target.toFixed(step.toString().split('.')[1].length);
        }

        this.numVal = target;
        this.onvaluechange();
    }

    onvaluechange() {
        const lastValue = this.value;
        let value;
        if (this.availableUnits.length > 1) {
            value = `${this.numVal} ${this.units}`;
        } else {
            value = this.numVal;
        }

        const continueDefault = this.dispatchEvent(new CustomEvent('beforechange', {
            detail: {
                value: this.value, lastValue
            },
            cancelable: true
        }));
        if (!continueDefault) { return; }

        this.value = value;
        this.dispatchEvent(new CustomEvent('change', {
            detail: {
                value: this.value, lastValue
            }
        }));
        this.lastUnits = this.units;
    }

    on(eventType, callback) {
        return this.addEventListener(eventType, callback);
    }

    get numVal() {
        return this.numberInput.val() || '0';
    }

    set numVal(value) {
        this.numberInput.val(value);
    }

    set units(value) {
        if (value && this.unitOptions[value]) {
            this.unitSelector.children('option').prop('selected', false);
            this.unitOptions[value].prop('selected', true);
            this.lastUnits = this.units;
        }
    }

    get units() {
        return this.unitSelector.val();
    }

    val(value) {
        if (value) {
            if (this.availableUnits.length > 1) {
                const pair = value.toString().split(' ');
                this.numVal = pair[0];
                this.units = pair[1];
                this.value = `${this.numVal} ${this.units}`;
            } else {
                this.numVal = value;
                this.value = this.numVal;
            }
        }
        return this.value;
    }

}

export class NumberField extends FormField {
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
            type: 'hidden'
        }).addClass(`powerbeamform-input ${this.prefix}-input form-control`).appendTo(this.div);
        this.assignStandardAttributes(this.input);

        this.numberField = new NumberSubField(this.params);
        this.numberField.generate(this.div);
        this.numberField.on('change', this.onchange.bind(this));
        this.numberField.on('unitchange', this.onunitchange.bind(this));
        return this;
    }

    onunitchange(e) {
        const detail = e.detail;
        detail.field = this;
        detail.name = this.params.name;
        const unitchangeEvent = new CustomEvent('unitchange', { detail });
        this.dispatchEvent(unitchangeEvent);
        this.form.dispatchEvent(unitchangeEvent);

        const fieldUnitchangeEvent = new CustomEvent(`${this.params.name}_unitchange`, { detail });
        this.form.dispatchEvent(fieldUnitchangeEvent);
    }

    onchange() {
        this.input.val(this.numberField.val());
        this._onchange();
    }

    setValue(value = '') {
        super.setValue(value);
        this.input.val(value);
        this.numberField.val(value);
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

        if (this.params.values) {
            this.input.prop('checked', true);
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
        super.setValue((value) ? '1' : undefined);
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
            if (optionParams.default) {
                option.input.prop('checked', true);
            }
            option.input.on('change', this._onchange.bind(this));
            option.label = $('<label>', { for: `${this.prefix}-input-${this.params.name}-${optionParams.value}`, html: optionParams.label })
                .addClass(`powerbeamform-label  ${this.prefix}-label form-check-label`).appendTo(option.div);

            this.options.push(option);
            this.input.push(option.input);
        }
    }
    setValue(value) {
        super.setValue(value);
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
            if (optionParams.default) {
                option.prop('selected', true);
            }
            this.options.push(option);
        }
        if (this.params.attributes) {
            this.input.attr(this.params.attributes);
        }
        this.input.on('change', this._onchange.bind(this));
        return this;
    }

    setValue(value) {
        super.setValue(value);
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
        super.setValue(value);
        this.input.val(value);
    }

    getValue() {
        return this.input.val();
    }
}

export class LabelField extends FormField {
    constructor(formgenerator, fieldParams) {
        super(formgenerator, fieldParams);
    }

    generate() {
        super.generate();
        this.label = $('<label>', {
            id: `${this.prefix}-input-${this.params.name}`,
        }).addClass(`powerbeamform-label ${this.prefix}-label`).html(this.params.label).appendTo(this.div);
        this.label.addClass(this.params.className);
        return this;
    }
    setValue(value) {
        super.setValue(value);
        this.label.html(value);
    }

    getValue() {
        return this.label.html();
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
        }).addClass(`powerbeamform-input ${this.prefix}-input form-control`);
        this.assignStandardAttributes(this.input);
        this.input.on('change', this._onchange.bind(this));
        return this;
    }
    setValue(value) {
        super.setValue(value);
        this.input.val(value);
    }

    getValue() {
        return this.input.val();
    }
}

export class FileField extends FormField {
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

    setValue() {
        console.warn('Cannot set a value for a file input');
    }

    getValue() {
        return this.input.files;
    }


    readAllFiles(readAs = 'text') {
        if (this.input.files.length < 1) return [];
        const filePromises = [];
        for (const file of this.input.files) {
            const promise = this.readFile(file, readAs);
            filePromises.push(promise);
        }
        return Promise.all(filePromises);
    }

    readFile(n = 0, readAs = 'text') {
        const file = this.input.files[n];

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                resolve(event.target.result);
            };
            reader.onerror = () => {
                reject();
            }
            switch (readAs) {
                case 'arrayBuffer':
                    reader.readAsArrayBuffer(file);
                    break;
                case 'binaryString':
                    reader.readAsBinaryString(file);
                    break;
                case 'dataURL':
                    reader.readAsDataURL(file);
                    break;
                case 'text':
                    reader.readAsText(file);
                    break;
            }
        });

    }


}