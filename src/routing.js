import qs from 'qs';
import merge from 'lodash.merge';
import getDeep from 'lodash.get';
import {mapQueryFields} from './validation';


const SERIALIZATION_OPTIONS = {
    allowDots: true,
    arrayFormat: 'repeat'
};

const _pruneNullLeaves = (obj) => {
    if (!Object.entries(obj).length) {
        return {};
    }
    return Object.assign(...Object.entries(obj).map(([k, v]) => {
        if (v === null) {
            return {};
        } else if (Array.isArray(v)) {
            return {[k]: v.filter(e => e !== null)};
        } else if (typeof v === 'object') {
            return {[k]: _pruneNullLeaves(v)};
        } else {
            return {[k]: v};
        }
    }));
};

const _applySerialization = (stateData, map) => {
    const result = {};
    Object.entries(map).forEach(([k, {stateField}]) => {
        result[k] = typeof stateField === 'string' ? getDeep(stateData, stateField, null) : stateField.serialize(stateData);
    });
    return result;
};

export const stateToQueryString = (state, ...maps) => {
    const serializedState = Object.assign(...maps.map((map) => _pruneNullLeaves(_applySerialization(state, map))));
    return qs.stringify(serializedState, SERIALIZATION_OPTIONS);
};

export const queryStringMiddleware = (history, {reduxPathname, routes}, config = {}) => {
    const {usePush} = config;
    return store => next => action => {
        const result = next(action);
        const state = store.getState();
        const currentPath = reduxPathname(state);
        const pathConfig = routes[currentPath];
        const routesConfig = pathConfig && !Array.isArray(pathConfig) ? [pathConfig] : pathConfig;

        if (routesConfig && routesConfig.length) {
            const prevData = qs.parse(history.location.search.slice(1), {
                allowDots: true
            });
            const dataList = routesConfig.filter(
                ({listen}) => listen === action.type
            ).map(({select, serialize}) => {
                const qsState = select(state);
                let data = _pruneNullLeaves(qsState);
                if (serialize) {
                    data = _applySerialization(data, serialize);
                }
                return data;
            });
            if (dataList.length) {
                let data = Object.assign(...dataList);
                data = _pruneNullLeaves({...prevData, ...data});
                const queryString = qs.stringify(data, SERIALIZATION_OPTIONS);
                const path = `${currentPath}?${queryString}`;
                if (usePush) {
                    history.push(path);
                } else {
                    history.replace(path);
                }
            }
        }
        return result;
    };
};

export const createQueryStringReducer = (config, qsFunc, resetFunc = (s => s)) => {
    return (state, action) => {
        const result = qsFunc(state, action);

        if (!result) {
            return resetFunc(state, null, null);
        }

        const {queryString, namespace} = result;
        if (queryString) {
            const values = qs.parse(queryString, {
                allowDots: true
            });
            let newValues = null;
            try {
                newValues = mapQueryFields(values, config);
                return merge({}, state, namespace ? {[namespace]: newValues} : newValues);
            } catch (e) {
                console.warn(e);
            }
        }
        return resetFunc(state, namespace, queryString);
    };
};
