
import { _decorator, Component, Node, EditBox } from 'cc';
import { SuperLayout } from '../core/super-layout';
import { ChatItem } from './chat-item';
const { ccclass, property } = _decorator;

@ccclass('Chat')
export class Chat extends Component {
    @property(SuperLayout) layout!: SuperLayout
    @property(EditBox) input!: EditBox

    private datas: any[] = []
    onLoad() {

    }
    onSend() {
        if (!this.input.string) return
        var msg = this.input.string
        this.sendMsg(true, msg)
        this.unscheduleAllCallbacks()
        this.scheduleOnce(() => {
            this.sendMsg(false, msg)
        }, 1)
        this.input.string = ""
    }
    sendMsg(me: boolean, msg: string) {
        this.datas.push({
            me: me,
            msg: msg
        })
        this.layout.total(this.datas.length)
        this.layout.scrollToFooter(0.2)
    }
    onRefreshEvent(item: Node, index: number) {
        item.getComponent(ChatItem)?.show(this.datas[index], index, this.layout)
    }
}
