import moment from 'moment';
import valid from 'validator';
import setDeep from 'lodash.set';


const funcs = Object.entries(valid)
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
        const {validator, sanitizer, stateField} = rule;
        let value = fields[key];

        if (value === undefined) {
            return {};
        }
        if (!validator(value)) {
            throw new Error(`Failed to validate query field: ${key} = ${value}`);
        }
        value = sanitizer ? sanitizer(value) : value;
        setDeep(data, stateField, value);
    });

    return data;
};
