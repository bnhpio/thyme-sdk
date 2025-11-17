import { defineConfig } from 'vocs';

export default defineConfig({
  title: 'Thyme Docs',
  basePath: '/thyme-sdk',
  sidebar: [
    {
      text: 'Thyme',
      link: '/getting-started',
    },
    {
      text: 'Example',
      link: '/example',
    },
    {
      text: 'Thyme CLI',
      link: '/cli',
      items: [
        {
          text: 'Quick Start',
          link: '/cli/quick-start',
        },
        {
          text: 'Commands',
          link: '/cli/commands',
          items: [
            {
              text: 'thyme create',
              link: '/cli/commands/thyme-create',
            },
            {
              text: 'thyme auth',
              link: '/cli/commands/thyme-auth',
            },
            {
              text: 'thyme simulate',
              link: '/cli/commands/thyme-simulate',
            },
            {
              text: 'thyme upload',
              link: '/cli/commands/thyme-upload',
            },
          ],
        },
        {
          text: 'Configuration',
          link: '/cli/configuration',
        },
      ],
    },
    {
      text: 'Thyme SDK',
      link: '/thyme-sdk',
    },
    {
      text: 'CLI + SDK',
      link: '/cli-sdk',
    },
  ],
});
