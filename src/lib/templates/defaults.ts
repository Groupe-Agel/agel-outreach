export const DEFAULT_MJML = `<mjml>
  <mj-head>
    <mj-title>AGEL Outreach</mj-title>
    <mj-attributes>
      <mj-all font-family="Helvetica, Arial, sans-serif" />
      <mj-text color="#333333" line-height="1.6" />
    </mj-attributes>
  </mj-head>
  <mj-body background-color="#efccd3">
    <mj-section background-color="#631d2a" padding="20px 24px">
      <mj-column>
        <mj-text color="#efccd3" font-size="16px" font-weight="600">
          AGEL GROUP
        </mj-text>
      </mj-column>
    </mj-section>
    <mj-section background-color="#ffffff" padding="32px 24px">
      <mj-column>
        <mj-text font-size="20px" font-weight="600" color="#631d2a">
          Bonjour {{full_name}},
        </mj-text>
        <mj-text>
          Nous avons le plaisir de vous informer que <strong>{{organization}}</strong>
          a été sélectionnée pour participer à notre programme.
        </mj-text>
        {{#if job_title}}
        <mj-text>
          En tant que {{job_title}}, votre profil correspond pleinement aux critères.
        </mj-text>
        {{/if}}
        <mj-button background-color="#631d2a" color="#ffffff" border-radius="6px" href="https://example.com">
          En savoir plus
        </mj-button>
        <mj-text>
          Cordialement,<br/>
          L'équipe AGEL
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`;

export const DEFAULT_SUBJECT = "Programme AGEL — {{organization}}";
