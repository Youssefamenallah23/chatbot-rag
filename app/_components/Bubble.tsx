type messageProp = {
  message: {
    id: string;
    content: string;
    role: string;
  };
};
function Bubble({ message }: messageProp) {
  const { content, role } = message;

  return <div className={`${role} bubble`}>{content}</div>;
}

export default Bubble;
