import { Link } from 'react-router-dom';
import { useClassInMessageConnection } from './classin-message-connection';
import { classInMessagesPath } from './classin-simulated-messages';
import styles from './ClassInMessageConnectionControl.module.css';
export function ClassInMessageConnectionControl() {
  const connection = useClassInMessageConnection();
  return <div className={styles.control} aria-label="测试课程连接">
    {connection.scene ? <Link to={classInMessagesPath(connection.scene)}>测试班级 · 真实数据</Link> : null}
    {connection.status === 'error' ? <span role="status" title={connection.error}>测试课程连接未完成</span> : null}
    <button type="button" disabled={connection.status === 'loading'} onClick={() => void connection.refresh()}>{connection.status === 'loading' ? '读取测试课程…' : connection.status === 'error' ? '重新连接测试课程' : '刷新测试课程'}</button>
  </div>;
}
