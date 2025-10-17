import { _decorator, Component, Node } from 'cc';
import { VirtualScrollView } from './core/VirtualScrollView';
const { ccclass, property } = _decorator;

@ccclass('Base')
export class Base extends Component {
    start() {
        let arr = this.node.getChildByName('ScrollView').getComponent(VirtualScrollView).getDataList();
        arr.push({name:'123'})
        arr.push({name:'124'})
        arr[2] = {name:'125'}
    }
    update(deltaTime: number) {
        
    }
}

