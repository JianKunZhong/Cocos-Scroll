import { _decorator, Component, Node, Prefab, instantiate, Vec3, warn } from 'cc';
const { ccclass, property } = _decorator;

export interface PoolStats {
  total: number;
  available: number;
  inUse: number;
  capacity: number;
}

/**
 * 轻量级的预制体内存池，用于统一创建、复用与存储节点实例。
 * 适配 Cocos Creator 3.x，避免频繁 instantiate/destroy 带来的开销。
 */
export class PrefabPool {
  private prefab: Prefab;
  private parent: Node | null;
  private capacity: number;
  private pool: Node[] = [];
  private inUse: Set<Node> = new Set();

  constructor(opts: { prefab: Prefab; parent?: Node | null; initialSize?: number; maxSize?: number }) {
    this.prefab = opts.prefab;
    this.parent = opts.parent ?? null;
    this.capacity = Math.max(0, opts.maxSize ?? 64);
    const initialSize = Math.min(Math.max(0, opts.initialSize ?? 0), this.capacity);
    if (initialSize > 0) {
      this.prewarm(initialSize);
    }
  }

  /**
   * 预热：提前创建若干实例并放入池中。
   */
  prewarm(count: number): void {
    const target = Math.min(count, this.capacity - this.total());
    for (let i = 0; i < target; i++) {
      const node = instantiate(this.prefab);
      if (this.parent) node.setParent(this.parent);
      node.active = false;
      this.pool.push(node);
    }
  }

  /**
   * 从池中获取一个节点；若池为空且未达容量，则新建一个。
   * 可指定临时父节点以便布局；若未指定，则默认使用构造时的 parent。
   */
  acquire(parent?: Node | null): Node | null {
    let node: Node | undefined = this.pool.pop();
    if (!node) {
      if (this.total() < this.capacity) {
        node = instantiate(this.prefab);
      } else {
        warn('[PrefabPool] Acquire failed: capacity reached.');
        return null;
      }
    }
    const targetParent = parent ?? this.parent;
    if (targetParent) node!.setParent(targetParent);
    node!.active = true;
    this.inUse.add(node!);
    return node!;
  }

  /**
   * 将节点归还给池。会自动设置为 inactive 并挂回默认父节点。
   */
  release(node: Node): void {
    if (!node || !this.inUse.has(node)) {
      // 不在使用集中，可能已被销毁或不是本池的对象
      return;
    }
    this.inUse.delete(node);
    node.active = false;
    if (this.parent) node.setParent(this.parent);
    // 归还到池，如果池已满则销毁以避免泄漏
    if (this.pool.length < this.capacity) {
      // 可选：重置位置/缩放等（根据需要）
      node.setPosition(Vec3.ZERO);
      this.pool.push(node);
    } else {
      node.destroy();
    }
  }

  /**
   * 动态调整容量。若降低容量，会尝试释放多余的闲置节点。
   */
  resize(newCapacity: number): void {
    this.capacity = Math.max(0, newCapacity);
    while (this.pool.length + this.inUse.size > this.capacity && this.pool.length > 0) {
      const n = this.pool.pop();
      if (n) n.destroy();
    }
  }

  /** 清理所有闲置节点（不影响当前在用的节点）。*/
  clearIdle(): void {
    while (this.pool.length > 0) {
      const n = this.pool.pop();
      if (n) n.destroy();
    }
  }

  /** 完全清理：销毁所有节点并重置状态。*/
  clearAll(): void {
    this.clearIdle();
    this.inUse.forEach((n) => {
      if (n && !n.isValid) return;
      n.destroy();
    });
    this.inUse.clear();
  }

  /** 返回池的统计信息。*/
  stats(): PoolStats {
    return {
      total: this.total(),
      available: this.pool.length,
      inUse: this.inUse.size,
      capacity: this.capacity,
    };
  }

  private total(): number {
    return this.pool.length + this.inUse.size;
  }
}

// /**
//  * 可挂载到场景节点的控制器封装，便于在编辑器中配置与使用。
//  * 用法：
//  * 1) 将本组件挂到某个节点，设置 `prefab`、`container`、`initialSize`、`maxSize`。
//  * 2) 通过 `get()` 获取节点实例，使用结束后调用 `recycle(node)`。
//  */
// @ccclass('PrefabPoolController')
// export class PrefabPoolController extends Component {
//   @property({ type: Prefab })
//   prefab: Prefab | null = null;

//   @property({ type: Node })
//   container: Node | null = null;

//   @property
//   initialSize = 10;

//   @property
//   maxSize = 64;

//   private pool: PrefabPool | null = null;

//   onLoad() {
//     if (!this.container) this.container = this.node;
//     if (this.prefab) {
//       this.pool = new PrefabPool({
//         prefab: this.prefab,
//         parent: this.container,
//         initialSize: this.initialSize,
//         maxSize: this.maxSize,
//       });
//     } else {
//       warn('[PrefabPoolController] Prefab is not set.');
//     }
//   }

//   /** 获取一个节点实例。可选指定父节点用于临时布局。*/
//   get(parent?: Node | null): Node | null {
//     if (!this.pool) return null;
//     return this.pool.acquire(parent ?? this.container);
//   }

//   /** 归还节点到池中。*/
//   recycle(node: Node): void {
//     if (!this.pool || !node) return;
//     this.pool.release(node);
//   }

//   /** 调整容量。*/
//   resize(capacity: number): void {
//     if (!this.pool) return;
//     this.pool.resize(capacity);
//   }

//   /** 清理闲置节点。*/
//   clearIdle(): void {
//     if (!this.pool) return;
//     this.pool.clearIdle();
//   }

//   /** 完全清理（包含在用节点）。*/
//   clearAll(): void {
//     if (!this.pool) return;
//     this.pool.clearAll();
//   }

//   /** 统计信息。*/
//   stats(): PoolStats | null {
//     if (!this.pool) return null;
//     return this.pool.stats();
//   }
// }

// /**
//  * 示例（代码中调用）：
//  *
//  * // 在某组件脚本中：
//  * // const poolCtrl = this.node.getComponent(PrefabPoolController);
//  * // const item = poolCtrl?.get();
//  * // 使用后： poolCtrl?.recycle(item!);
//  */