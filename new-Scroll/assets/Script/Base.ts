import { _decorator, Component, Node } from 'cc';
import { VirtualScrollView } from './core/VirtualScrollView';
const { ccclass, property } = _decorator;

@ccclass('Base')
export class Base extends Component {
    start() {
        let data = this.node.getChildByName('ScrollView').getComponent(VirtualScrollView).getReactiveData();
        data.value = [
            {name:'虚拟列表1'},
            {name:'虚拟列表2'},
            {name:'虚拟列表3'},
            {name:'虚拟列表4'},
            {name:'虚拟列表5'},
            {name:'虚拟列表7'},
            {name:'虚拟列表8'},
            {name:'虚拟列表9'},
            {name:'虚拟列表10'},
            {name:'虚拟列表11'},
            {name:'虚拟列表12'},
            {name:'虚拟列表13'},
        ]
        // data.value[0].name = "修改后"
        // data.value.push({name:'126'})
    }
    update(deltaTime: number) {
        
    }
}

