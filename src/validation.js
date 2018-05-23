import moment from 'moment';
import validatorModule from 'validator';
import setDeep from 'lodash.set';


const funcs = Object.entries(validatorModule)
    .filter(([, fn]) => typeof fn === 'function')
    .map(([key, fn]) => {
        return {[key]: (...options) => (str) => fn(str, ...options)};
    });

export const validator = Object.assign({
    isDate: () => str => moment(str, 'YYYY-MM-DD').isValid(),
    isTime: () => str => moment(str, 'HH:mm').isValid()
}, ...funcs);


export const mapQueryFields = (fields, mapping) => {
    const data = {};
    Object.entries(mapping).forEach(([key, rule]) => {
        const {validator: valid, sanitizer, stateField} = rule;
        let value = fields[key];

        if (value === undefined) {
            return {};
        }
        if (valid && !valid(value)) {
            throw new Error(`Failed to validate query field: ${key} = ${value}`);
        }

        value = sanitizer ? sanitizer(value) : value;
        if (typeof stateField === 'string') {
            setDeep(data, stateField, value);
        } else {
            stateField.parse(value, data);
        }
    });

    return data;
};
