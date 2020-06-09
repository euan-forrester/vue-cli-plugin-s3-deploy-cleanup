module.exports = [
  {
    name: 'tagKey',
    type: 'input',
    message: 'What is the key for the tag to be applied to files that need to be cleaned up?',
    default: 'DeployLifecycle'
  },
  {
    name: 'tagValue',
    type: 'input',
    message: 'What is the value for the tag to be applied to files that need to be cleaned up?',
    default: 'DeleteMe'
  },
];