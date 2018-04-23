import moment from 'moment';
import valid from 'validator';
import setDeep from 'lodash.set';

// Proxy object that allows for partial validator functions
// e.g. validator.isIn(['a', 'b'])(val)
// It also implements a few useful utility methods
const _validator = new Proxy({
    isDate: str => moment(str, 'YYYY-MM-DD').isValid(),
    isTime: str => moment(str, 'HH:mm').isValid()
}, {
    get: (obj, prop) => (...options) => str => ((obj[prop] ? obj[prop] : valid[prop])(str, ...options))
});
export {_validator as validator};

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
