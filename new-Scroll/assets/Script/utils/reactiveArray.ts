// ReactiveData.ts
export class ReactiveData<T> {
    private _value: T;
    private _listeners: Array<(newValue: T, oldValue: T) => void> = [];

    constructor(initialValue: T) {
        this._value = this.makeReactive(initialValue);
    }

    get value(): T {
        return this._value;
    }

    set value(newValue: T) {
        const oldValue = this._value;
        this._value = this.makeReactive(newValue);
        this.notifyChange(this._value, oldValue);
    }

    private makeReactive(obj: any): any {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }

        const self = this;
        
        // 对数组进行特殊处理
        if (Array.isArray(obj)) {
            // 重写数组方法
            const arrayMethods = ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse'];
            arrayMethods.forEach(method => {
                const original = obj[method];
                obj[method] = function(...args: any[]) {
                    const result = original.apply(this, args);
                    self.notifyChange(self._value, self._value);
                    return result;
                };
            });
            
            // 递归处理数组元素
            for (let i = 0; i < obj.length; i++) {
                obj[i] = self.makeReactive(obj[i]);
            }
        } else {
            // 处理普通对象
            Object.keys(obj).forEach(key => {
                let value = obj[key];
                Object.defineProperty(obj, key, {
                    get() {
                        return value;
                    },
                    set(newVal) {
                        if (newVal !== value) {
                            value = self.makeReactive(newVal);
                            self.notifyChange(self._value, self._value);
                        }
                    }
                });
                
                // 递归处理嵌套对象
                obj[key] = self.makeReactive(value);
            });
        }
        
        return obj;
    }

    public onChange(callback: (newValue: T, oldValue: T) => void): void {
        this._listeners.push(callback);
    }

    public offChange(callback: (newValue: T, oldValue: T) => void): void {
        const index = this._listeners.indexOf(callback);
        if (index > -1) {
            this._listeners.splice(index, 1);
        }
    }

    private notifyChange(newValue: T, oldValue: T): void {
        for (const listener of this._listeners) {
            listener(newValue, oldValue);
        }
    }
}