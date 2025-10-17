
import { _decorator, Component, Node, Label, EditBox, Size } from 'cc';
import { BaseItem } from './baseItem';
import { SuperLayout } from '../core/super-layout';
const { ccclass, property } = _decorator;
@ccclass('Vertical')
export class Vertical extends BaseItem {
    onLoad() {
        this.input.placeholder = this.transform?.height.toString()!
    }
    onInput() {
        let height = Number(this.input.string)
        if (isNaN(height)) return
        if (height < 100) {
            return
        }
        this.transform?.setContentSize(new Size(this.transform.contentSize.width, height))
        this.layout.updateItemSize(this.node, this.transform?.contentSize!)
    }
    show(data: any, index: number, callback: Function, layout: SuperLayout) {
        super.show(data, index, callback, layout)
        var time = Math.random() * 2
        // const height = Math.random() * 200 + 100
        var scale = Math.random()
        scale = Math.max(0.5, scale)
        scale = Math.min(2, scale)
        const height = index % 2 == 0 ? 100 : 150
        const size = new Size(this.transform?.width, height)
        // this.unscheduleAllCallbacks()
        // this.scheduleOnce(() => {
        //     this.transform?.setContentSize(size)
        // }, time)
        // this.transform?.setContentSize(size)
        // layout.updateItemSize(this.node, size)
    }
}
