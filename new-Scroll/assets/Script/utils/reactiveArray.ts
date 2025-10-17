// 轻量的响应式数组实现（参考 Vue3 的 Proxy 思路）
export type ArrayChangeType = 'set' | 'delete' | 'method' | 'length';
export interface ArrayChange {
  type: ArrayChangeType;
  key?: number | string;
  oldValue?: any;
  value?: any;
  method?: string;
  args?: any[];
  length?: number;
}

const mutableMethods = new Set(['push','pop','shift','unshift','splice','sort','reverse','copyWithin','fill']);

export function createReactiveArray<T>(arr: T[], onChange: (change: ArrayChange) => void): T[] {
  return new Proxy(arr, {
    get(target, prop, receiver) {
      const val = Reflect.get(target, prop, receiver);
      if (typeof prop === 'string' && typeof val === 'function' && mutableMethods.has(prop)) {
        return (...args: any[]) => {
          const result = Reflect.apply(val, target, args);
          onChange({ type: 'method', method: prop, args, length: target.length });
          return result;
        };
      }
      return val;
    },
    set(target, prop, value, receiver) {
      const oldValue = (target as any)[prop];
      const res = Reflect.set(target, prop, value, receiver);
      if (prop === 'length') {
        onChange({ type: 'length', length: value as any });
      } else {
        onChange({ type: 'set', key: prop as any, oldValue, value });
      }
      return res;
    },
    deleteProperty(target, prop) {
      const oldValue = (target as any)[prop];
      const res = Reflect.deleteProperty(target, prop);
      onChange({ type: 'delete', key: prop as any, oldValue });
      return res;
    }
  });
}